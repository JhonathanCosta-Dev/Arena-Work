-- "Mal perdedor" tag: refusing a registered result tags the player who refused.
-- Only an admin can remove it. Points still count only after the opponent accepts.

alter table public.profiles
  add column bad_loser boolean not null default false,
  add column bad_loser_since timestamptz;

-- Same as the original dispute_match, plus tagging the player who refused.
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

  update public.profiles
  set bad_loser = true, bad_loser_since = coalesce(bad_loser_since, now())
  where id = v_user_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, new_data)
  values (
    v_user_id,
    'profile.bad_loser_tagged',
    'profile',
    v_user_id,
    jsonb_build_object('match_id', p_match_id)
  );

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_match.created_by,
    'match_disputed',
    'Resultado recusado',
    'Seu adversário recusou o placar. Um administrador vai revisar a partida.',
    jsonb_build_object('match_id', p_match_id)
  );
end;
$$;

create or replace function public.admin_clear_bad_loser(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_tagged boolean;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;

  select bad_loser into v_tagged from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001'; end if;
  if not v_tagged then return; end if;

  update public.profiles set bad_loser = false, bad_loser_since = null where id = p_profile_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    v_admin,
    'profile.bad_loser_cleared',
    'profile',
    p_profile_id,
    jsonb_build_object('bad_loser', true),
    jsonb_build_object('bad_loser', false)
  );

  insert into public.notifications (user_id, type, title, body, data)
  values (
    p_profile_id,
    'bad_loser_cleared',
    'Tag removida',
    'Um administrador removeu a sua tag de mal perdedor.',
    '{}'::jsonb
  );
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set read_at = now()
  where user_id = (select auth.uid()) and read_at is null;
$$;

revoke all on function public.admin_clear_bad_loser(uuid) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.admin_clear_bad_loser(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
