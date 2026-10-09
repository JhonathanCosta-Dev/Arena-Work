-- Alfinet Arena - initial competitive domain
-- Timestamps are stored in UTC (timestamptz). Presentation timezone is handled by the app.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create type public.app_role as enum ('employee', 'admin');
create type public.season_status as enum ('scheduled', 'active', 'finished');
create type public.match_status as enum (
  'pending_confirmation',
  'confirmed',
  'disputed',
  'cancelled'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 120),
  email citext not null unique,
  avatar_url text,
  role public.app_role not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique,
  is_active boolean not null default true,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete restrict,
  name text not null,
  slug text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.season_status not null default 'scheduled',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_date_order check (starts_at < ends_at),
  constraint seasons_sport_slug_unique unique (sport_id, slug)
);

-- Database-level race protection: only one active season per sport.
create unique index seasons_one_active_per_sport_idx
  on public.seasons (sport_id)
  where status = 'active';

create index seasons_sport_status_idx on public.seasons (sport_id, status);
create index seasons_starts_at_idx on public.seasons (starts_at desc);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  request_id uuid not null,
  status public.match_status not null default 'pending_confirmation',
  played_at timestamptz not null default now(),
  confirmed_by uuid references public.profiles(id) on delete restrict,
  confirmed_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete restrict,
  cancelled_at timestamptz,
  cancellation_reason text,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_request_unique unique (created_by, request_id),
  constraint matches_creator_cannot_confirm check (confirmed_by is null or confirmed_by <> created_by),
  constraint matches_confirmed_state check (
    (status = 'confirmed' and confirmed_by is not null and confirmed_at is not null)
    or status <> 'confirmed'
  ),
  constraint matches_cancelled_state check (
    (status = 'cancelled' and cancelled_at is not null)
    or status <> 'cancelled'
  )
);

create index matches_season_status_played_idx
  on public.matches (season_id, status, played_at desc);
create index matches_created_by_created_at_idx
  on public.matches (created_by, created_at desc);
create index matches_status_created_at_idx
  on public.matches (status, created_at desc);

create table public.match_sides (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  side smallint not null check (side in (1, 2)),
  score smallint not null check (score between 0 and 99),
  created_at timestamptz not null default now(),
  constraint match_sides_match_side_unique unique (match_id, side),
  constraint match_sides_id_match_unique unique (id, match_id)
);

create index match_sides_match_idx on public.match_sides (match_id);

-- `side` is normalized separately from participants so a side may contain one player today,
-- or multiple players later (doubles / teams), without duplicating the side score.
create table public.match_participants (
  match_id uuid not null references public.matches(id) on delete cascade,
  side_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (match_id, profile_id),
  constraint match_participants_side_fk
    foreign key (side_id, match_id)
    references public.match_sides(id, match_id)
    on delete cascade
);

create index match_participants_profile_match_idx
  on public.match_participants (profile_id, match_id);
create index match_participants_side_idx on public.match_participants (side_id);

create table public.match_disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete restrict,
  opened_by uuid not null references public.profiles(id) on delete restrict,
  reason text check (reason is null or char_length(reason) <= 500),
  resolution text,
  resolved_by uuid references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.season_results (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  final_position integer not null check (final_position > 0),
  points integer not null check (points >= 0),
  wins integer not null check (wins >= 0),
  losses integer not null check (losses >= 0),
  matches_played integer not null check (matches_played >= 0),
  win_rate numeric(7, 6) not null check (win_rate between 0 and 1),
  best_streak integer not null check (best_streak >= 0),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint season_results_player_unique unique (season_id, profile_id),
  constraint season_results_position_unique unique (season_id, final_position)
);

create index season_results_profile_idx
  on public.season_results (profile_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create table public.audit_logs (
  id bigint generated by default as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx
  on public.audit_logs (actor_user_id, created_at desc);

-- Generic updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger sports_set_updated_at before update on public.sports
for each row execute function public.set_updated_at();
create trigger seasons_set_updated_at before update on public.seasons
for each row execute function public.set_updated_at();
create trigger matches_set_updated_at before update on public.matches
for each row execute function public.set_updated_at();

-- Profiles are created from invited Auth users. Public sign-up is disabled in the Supabase project.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Security helper functions live as SECURITY DEFINER so RLS policies don't recurse through profiles/matches.
create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active
  );
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active and p.role = 'admin'
  );
$$;

create or replace function public.is_match_participant(p_match_id uuid, p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.match_participants mp
    where mp.match_id = p_match_id and mp.profile_id = p_profile_id
  );
$$;

create or replace function public.can_view_match(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matches m
    where m.id = p_match_id
      and public.current_user_is_active()
      and (
        m.status = 'confirmed'
        or public.is_match_participant(m.id, (select auth.uid()))
        or public.current_user_is_admin()
      )
  );
$$;

-- RLS: default deny; expose only the reads the internal app needs.
alter table public.profiles enable row level security;
alter table public.sports enable row level security;
alter table public.seasons enable row level security;
alter table public.matches enable row level security;
alter table public.match_sides enable row level security;
alter table public.match_participants enable row level security;
alter table public.match_disputes enable row level security;
alter table public.season_results enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.sports from anon, authenticated;
revoke all on table public.seasons from anon, authenticated;
revoke all on table public.matches from anon, authenticated;
revoke all on table public.match_sides from anon, authenticated;
revoke all on table public.match_participants from anon, authenticated;
revoke all on table public.match_disputes from anon, authenticated;
revoke all on table public.season_results from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;

revoke usage on schema public from anon;
grant usage on schema public to authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.sports to authenticated;
grant select on table public.seasons to authenticated;
grant select on table public.matches to authenticated;
grant select on table public.match_sides to authenticated;
grant select on table public.match_participants to authenticated;
grant select on table public.match_disputes to authenticated;
grant select on table public.season_results to authenticated;
grant select on table public.notifications to authenticated;
grant select on table public.audit_logs to authenticated;

create policy profiles_select_internal
on public.profiles for select to authenticated
using (public.current_user_is_active());

create policy sports_select_internal
on public.sports for select to authenticated
using (public.current_user_is_active());

create policy seasons_select_internal
on public.seasons for select to authenticated
using (public.current_user_is_active());

create policy matches_select_visible
on public.matches for select to authenticated
using (
  public.current_user_is_active()
  and (
    status = 'confirmed'
    or public.is_match_participant(id, (select auth.uid()))
    or public.current_user_is_admin()
  )
);

create policy match_sides_select_visible
on public.match_sides for select to authenticated
using (public.can_view_match(match_id));

create policy match_participants_select_visible
on public.match_participants for select to authenticated
using (public.can_view_match(match_id));

create policy match_disputes_select_visible
on public.match_disputes for select to authenticated
using (
  public.current_user_is_admin()
  or public.is_match_participant(match_id, (select auth.uid()))
);

create policy season_results_select_internal
on public.season_results for select to authenticated
using (public.current_user_is_active());

create policy notifications_select_own
on public.notifications for select to authenticated
using (user_id = (select auth.uid()) and public.current_user_is_active());

create policy audit_logs_select_admin
on public.audit_logs for select to authenticated
using (public.current_user_is_admin());

-- Match mutation API. Direct DML remains unavailable to authenticated clients.
create or replace function public.register_match(
  p_request_id uuid,
  p_opponent_id uuid,
  p_score_self smallint,
  p_score_opponent smallint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_season_id uuid;
  v_match_id uuid;
  v_side_self uuid;
  v_side_opponent uuid;
  v_existing_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if not public.current_user_is_active() then
    raise exception 'USER_INACTIVE' using errcode = 'P0001';
  end if;

  if p_opponent_id = v_user_id then
    raise exception 'SELF_MATCH_NOT_ALLOWED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = p_opponent_id and p.is_active
  ) then
    raise exception 'OPPONENT_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  if not (
    (p_score_self = 2 and p_score_opponent in (0, 1))
    or (p_score_opponent = 2 and p_score_self in (0, 1))
  ) then
    raise exception 'INVALID_SCORE' using errcode = 'P0001';
  end if;

  -- Idempotency: repeated delivery of the same client request returns the same match.
  select m.id into v_existing_id
  from public.matches m
  where m.created_by = v_user_id and m.request_id = p_request_id;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  select s.id into v_season_id
  from public.seasons s
  join public.sports sp on sp.id = s.sport_id
  where sp.slug = 'ping-pong'
    and sp.is_active
    and s.status = 'active'
    and now() >= s.starts_at
    and now() < s.ends_at
  for share of s;

  if v_season_id is null then
    raise exception 'NO_ACTIVE_SEASON' using errcode = 'P0001';
  end if;

  insert into public.matches (season_id, created_by, request_id)
  values (v_season_id, v_user_id, p_request_id)
  returning id into v_match_id;

  insert into public.match_sides (match_id, side, score)
  values (v_match_id, 1, p_score_self)
  returning id into v_side_self;

  insert into public.match_sides (match_id, side, score)
  values (v_match_id, 2, p_score_opponent)
  returning id into v_side_opponent;

  insert into public.match_participants (match_id, side_id, profile_id)
  values
    (v_match_id, v_side_self, v_user_id),
    (v_match_id, v_side_opponent, p_opponent_id);

  insert into public.notifications (user_id, type, title, body, data)
  values (
    p_opponent_id,
    'match_confirmation_requested',
    'Resultado aguardando sua confirmação',
    'Uma partida foi registrada contra você.',
    jsonb_build_object('match_id', v_match_id)
  );

  return v_match_id;
exception
  when unique_violation then
    select m.id into v_existing_id
    from public.matches m
    where m.created_by = v_user_id and m.request_id = p_request_id;
    if v_existing_id is not null then return v_existing_id; end if;
    raise;
end;
$$;

create or replace function public.confirm_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_match public.matches%rowtype;
begin
  if v_user_id is null or not public.current_user_is_active() then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'MATCH_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_match.status <> 'pending_confirmation' then
    raise exception 'MATCH_NOT_PENDING' using errcode = 'P0001';
  end if;
  if v_match.created_by = v_user_id then
    raise exception 'CREATOR_CANNOT_CONFIRM' using errcode = 'P0001';
  end if;
  if not public.is_match_participant(p_match_id, v_user_id) then
    raise exception 'NOT_A_PARTICIPANT' using errcode = 'P0001';
  end if;

  update public.matches
  set status = 'confirmed', confirmed_by = v_user_id, confirmed_at = now(), version = version + 1
  where id = p_match_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_match.created_by,
    'match_confirmed',
    'Resultado confirmado',
    'Seu adversário confirmou a partida. O ranking foi atualizado.',
    jsonb_build_object('match_id', p_match_id)
  );
end;
$$;

create or replace function public.dispute_match(p_match_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_match public.matches%rowtype;
begin
  if v_user_id is null or not public.current_user_is_active() then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if p_reason is not null and char_length(p_reason) > 500 then
    raise exception 'REASON_TOO_LONG' using errcode = 'P0001';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'MATCH_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_match.status <> 'pending_confirmation' then
    raise exception 'MATCH_NOT_PENDING' using errcode = 'P0001';
  end if;
  if v_match.created_by = v_user_id then
    raise exception 'CREATOR_CANNOT_DISPUTE_OWN_REQUEST' using errcode = 'P0001';
  end if;
  if not public.is_match_participant(p_match_id, v_user_id) then
    raise exception 'NOT_A_PARTICIPANT' using errcode = 'P0001';
  end if;

  insert into public.match_disputes (match_id, opened_by, reason)
  values (p_match_id, v_user_id, nullif(trim(p_reason), ''));

  update public.matches
  set status = 'disputed', version = version + 1
  where id = p_match_id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_match.created_by,
    'match_disputed',
    'Resultado contestado',
    'Seu adversário contestou uma partida. Um administrador poderá revisar o resultado.',
    jsonb_build_object('match_id', p_match_id)
  );
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and user_id = (select auth.uid());
$$;

revoke all on function public.register_match(uuid, uuid, smallint, smallint) from public, anon;
revoke all on function public.confirm_match(uuid) from public, anon;
revoke all on function public.dispute_match(uuid, text) from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;

grant execute on function public.register_match(uuid, uuid, smallint, smallint) to authenticated;
grant execute on function public.confirm_match(uuid) to authenticated;
grant execute on function public.dispute_match(uuid, text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;

-- Seed the first sport definition. This is domain configuration, not demo data.
insert into public.sports (slug, name, rules)
values (
  'ping-pong',
  'Ping Pong',
  '{"scoring":{"winPoints":3,"lossPoints":0},"match":{"bestOfSets":3,"winningSets":2,"drawAllowed":false}}'::jsonb
)
on conflict (slug) do nothing;
