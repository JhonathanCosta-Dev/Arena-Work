-- Administrative state transitions are also transactional RPCs.

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

create or replace function public.admin_resolve_dispute(
  p_match_id uuid,
  p_resolution text,
  p_score_side_1 smallint default null,
  p_score_side_2 smallint default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_match public.matches%rowtype;
  v_old jsonb;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'MATCH_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_match.status <> 'disputed' then
    raise exception 'MATCH_NOT_DISPUTED' using errcode = 'P0001';
  end if;
  if p_resolution not in ('confirm', 'correct_and_confirm', 'cancel') then
    raise exception 'INVALID_RESOLUTION' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'status', v_match.status,
    'scores', (
      select jsonb_agg(jsonb_build_object('side', ms.side, 'score', ms.score) order by ms.side)
      from public.match_sides ms where ms.match_id = p_match_id
    )
  ) into v_old;

  if p_resolution = 'correct_and_confirm' then
    if not (
      (p_score_side_1 = 2 and p_score_side_2 in (0, 1))
      or (p_score_side_2 = 2 and p_score_side_1 in (0, 1))
    ) then
      raise exception 'INVALID_SCORE' using errcode = 'P0001';
    end if;

    update public.match_sides
    set score = case side when 1 then p_score_side_1 else p_score_side_2 end
    where match_id = p_match_id;
  end if;

  if p_resolution in ('confirm', 'correct_and_confirm') then
    update public.matches
    set status = 'confirmed', confirmed_by = v_admin, confirmed_at = now(), version = version + 1
    where id = p_match_id;
  else
    update public.matches
    set status = 'cancelled', cancelled_by = v_admin, cancelled_at = now(),
        cancellation_reason = 'Disputa resolvida por administrador', version = version + 1
    where id = p_match_id;
  end if;

  update public.match_disputes
  set resolution = p_resolution, resolved_by = v_admin, resolved_at = now()
  where match_id = p_match_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    v_admin,
    'match.dispute_resolved',
    'match',
    p_match_id,
    v_old,
    jsonb_build_object('resolution', p_resolution, 'status', case when p_resolution = 'cancel' then 'cancelled' else 'confirmed' end)
  );
end;
$$;

create or replace function public.admin_cancel_match(p_match_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_match public.matches%rowtype;
begin
  if not public.current_user_is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception 'MATCH_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_match.status = 'cancelled' then return; end if;

  update public.matches
  set status = 'cancelled', cancelled_by = v_admin, cancelled_at = now(),
      cancellation_reason = left(nullif(trim(p_reason), ''), 500), version = version + 1
  where id = p_match_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, old_data, new_data)
  values (
    v_admin,
    'match.cancelled',
    'match',
    p_match_id,
    jsonb_build_object('status', v_match.status),
    jsonb_build_object('status', 'cancelled', 'reason', left(nullif(trim(p_reason), ''), 500))
  );
end;
$$;

revoke all on function public.admin_start_season(uuid) from public, anon;
revoke all on function public.admin_resolve_dispute(uuid, text, smallint, smallint) from public, anon;
revoke all on function public.admin_cancel_match(uuid, text) from public, anon;

grant execute on function public.admin_start_season(uuid) to authenticated;
grant execute on function public.admin_resolve_dispute(uuid, text, smallint, smallint) to authenticated;
grant execute on function public.admin_cancel_match(uuid, text) to authenticated;
