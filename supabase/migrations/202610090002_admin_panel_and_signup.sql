-- Admin panel (seasons + member approval) and self sign-up pending approval.

-- Self sign-up is allowed, but new profiles start inactive until an admin approves them.
-- `raw_app_meta_data` is writable only with the service role, so `approved: true` can be trusted
-- for users created by an admin/seed via the Auth Admin API.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, is_active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_app_meta_data ->> 'approved')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Season dates are picked as calendar days in the app timezone: the season starts at 00:00 of
-- p_start_date and ends at 00:00 of the day after p_end_date (end date inclusive). Stored in UTC.
create or replace function public.season_bounds(
  p_start_date date,
  p_end_date date,
  p_timezone text,
  out starts_at timestamptz,
  out ends_at timestamptz
)
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_start_date is null or p_end_date is null then
    raise exception 'INVALID_SEASON_DATES' using errcode = 'P0001';
  end if;
  if p_end_date < p_start_date then
    raise exception 'SEASON_END_BEFORE_START' using errcode = 'P0001';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'INVALID_TIMEZONE' using errcode = 'P0001';
  end if;

  starts_at := p_start_date::timestamp at time zone p_timezone;
  ends_at := (p_end_date + 1)::timestamp at time zone p_timezone;
end;
$$;

revoke all on function public.season_bounds(date, date, text) from public, anon, authenticated;

create or replace function public.admin_create_season(
  p_name text,
  p_start_date date,
  p_end_date date,
  p_timezone text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_sport_id uuid;
  v_bounds record;
  v_name text := nullif(trim(p_name), '');
  v_season_id uuid;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;
  if v_name is null or char_length(v_name) > 80 then
    raise exception 'INVALID_SEASON_NAME' using errcode = 'P0001';
  end if;

  select * into v_bounds from public.season_bounds(p_start_date, p_end_date, p_timezone);

  select id into v_sport_id from public.sports where slug = 'ping-pong';

  insert into public.seasons (sport_id, name, slug, starts_at, ends_at, status, created_by)
  values (
    v_sport_id,
    v_name,
    to_char(p_start_date, 'YYYY-MM-DD') || '-' || left(replace(gen_random_uuid()::text, '-', ''), 6),
    v_bounds.starts_at,
    v_bounds.ends_at,
    'scheduled',
    v_admin
  )
  returning id into v_season_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, new_data)
  values (
    v_admin,
    'season.created',
    'season',
    v_season_id,
    jsonb_build_object('name', v_name, 'starts_at', v_bounds.starts_at, 'ends_at', v_bounds.ends_at)
  );

  return v_season_id;
end;
$$;

create or replace function public.admin_update_season(
  p_season_id uuid,
  p_name text,
  p_start_date date,
  p_end_date date,
  p_timezone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_season public.seasons%rowtype;
  v_bounds record;
  v_name text := nullif(trim(p_name), '');
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;
  if v_name is null or char_length(v_name) > 80 then
    raise exception 'INVALID_SEASON_NAME' using errcode = 'P0001';
  end if;

  select * into v_season from public.seasons where id = p_season_id for update;
  if not found then raise exception 'SEASON_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_season.status = 'finished' then
    raise exception 'SEASON_FINISHED' using errcode = 'P0001';
  end if;

  select * into v_bounds from public.season_bounds(p_start_date, p_end_date, p_timezone);

  update public.seasons
  set name = v_name, starts_at = v_bounds.starts_at, ends_at = v_bounds.ends_at
  where id = p_season_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    v_admin,
    'season.updated',
    'season',
    p_season_id,
    jsonb_build_object('name', v_season.name, 'starts_at', v_season.starts_at, 'ends_at', v_season.ends_at),
    jsonb_build_object('name', v_name, 'starts_at', v_bounds.starts_at, 'ends_at', v_bounds.ends_at)
  );
end;
$$;

-- Replaces the original version with a friendly error when another season is already active
-- (the partial unique index would otherwise surface as a raw unique_violation).
create or replace function public.admin_start_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_season from public.seasons where id = p_season_id for update;
  if not found then raise exception 'SEASON_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_season.status <> 'scheduled' then
    raise exception 'SEASON_NOT_SCHEDULED' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.seasons s
    where s.sport_id = v_season.sport_id and s.status = 'active' and s.id <> p_season_id
  ) then
    raise exception 'ANOTHER_SEASON_ACTIVE' using errcode = 'P0001';
  end if;

  update public.seasons set status = 'active' where id = p_season_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    (select auth.uid()),
    'season.started',
    'season',
    p_season_id,
    jsonb_build_object('status', v_season.status),
    jsonb_build_object('status', 'active')
  );
end;
$$;

create or replace function public.admin_finish_season(p_season_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season public.seasons%rowtype;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_season from public.seasons where id = p_season_id for update;
  if not found then raise exception 'SEASON_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_season.status <> 'active' then
    raise exception 'SEASON_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  update public.seasons set status = 'finished' where id = p_season_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    (select auth.uid()),
    'season.finished',
    'season',
    p_season_id,
    jsonb_build_object('status', v_season.status),
    jsonb_build_object('status', 'finished')
  );
end;
$$;

create or replace function public.admin_set_profile_active(p_profile_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_old boolean;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;
  if p_profile_id = v_admin then
    raise exception 'CANNOT_CHANGE_OWN_ACCESS' using errcode = 'P0001';
  end if;

  select is_active into v_old from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_old = p_active then return; end if;

  update public.profiles set is_active = p_active where id = p_profile_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    v_admin,
    case when p_active then 'profile.activated' else 'profile.deactivated' end,
    'profile',
    p_profile_id,
    jsonb_build_object('is_active', v_old),
    jsonb_build_object('is_active', p_active)
  );
end;
$$;

revoke all on function public.admin_create_season(text, date, date, text) from public, anon;
revoke all on function public.admin_update_season(uuid, text, date, date, text) from public, anon;
revoke all on function public.admin_start_season(uuid) from public, anon;
revoke all on function public.admin_finish_season(uuid) from public, anon;
revoke all on function public.admin_set_profile_active(uuid, boolean) from public, anon;

grant execute on function public.admin_create_season(text, date, date, text) to authenticated;
grant execute on function public.admin_update_season(uuid, text, date, date, text) to authenticated;
grant execute on function public.admin_start_season(uuid) to authenticated;
grant execute on function public.admin_finish_season(uuid) to authenticated;
grant execute on function public.admin_set_profile_active(uuid, boolean) to authenticated;
