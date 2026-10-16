-- Individual games scored in points replace best-of-3 set results.
-- A game goes to 11 or 21 points and must be won by 2 (11×9, 12×10, 21×19, 23×21...).
-- Legacy matches keep their set scores and have points_to_win = null.
-- A pending draw is no longer registered as 1×1: both players are told to play a tiebreak whenever
-- their all-time head-to-head becomes level after a confirmed game.

alter table public.matches
  add column points_to_win smallint check (points_to_win in (11, 21));

update public.sports
set rules = '{"scoring":{"winPoints":3,"lossPoints":0},"match":{"type":"single_game","pointsToWin":[11,21],"winBy":2,"drawAllowed":false}}'::jsonb
where slug = 'ping-pong';

create or replace function public.is_valid_game_score(
  p_points_to_win smallint,
  p_score_a smallint,
  p_score_b smallint
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_points_to_win in (11, 21)
    and p_score_a >= 0
    and p_score_b >= 0
    and (
      (greatest(p_score_a, p_score_b) = p_points_to_win
        and least(p_score_a, p_score_b) <= p_points_to_win - 2)
      or (greatest(p_score_a, p_score_b) > p_points_to_win
        and least(p_score_a, p_score_b) = greatest(p_score_a, p_score_b) - 2)
    ),
    false
  );
$$;

revoke all on function public.is_valid_game_score(smallint, smallint, smallint) from public, anon, authenticated;

-- Called after a game is confirmed. Counts confirmed wins between the two players across every
-- season (legacy set matches included) and notifies both when the head-to-head is level.
create or replace function public.notify_head_to_head_tie(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_players uuid[];
  v_wins_a integer;
  v_wins_b integer;
begin
  select array_agg(mp.profile_id order by ms.side) into v_players
  from public.match_participants mp
  join public.match_sides ms on ms.id = mp.side_id
  where mp.match_id = p_match_id;

  if coalesce(array_length(v_players, 1), 0) <> 2 then
    return;
  end if;

  with head_to_head as (
    select m.id
    from public.matches m
    where m.status = 'confirmed'
      and exists (
        select 1 from public.match_participants p
        where p.match_id = m.id and p.profile_id = v_players[1]
      )
      and exists (
        select 1 from public.match_participants p
        where p.match_id = m.id and p.profile_id = v_players[2]
      )
  ),
  winners as (
    select distinct on (h.id) mp.profile_id as winner_id
    from head_to_head h
    join public.match_sides ms on ms.match_id = h.id
    join public.match_participants mp on mp.side_id = ms.id
    order by h.id, ms.score desc
  )
  select
    count(*) filter (where winner_id = v_players[1]),
    count(*) filter (where winner_id = v_players[2])
  into v_wins_a, v_wins_b
  from winners;

  if v_wins_a = 0 or v_wins_a <> v_wins_b then
    return;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  select
    me.id,
    'match_draw_pending',
    'Empate pendente',
    format(
      'Você e %s estão empatados em %s×%s no confronto direto. Joguem o desempate e registrem o resultado.',
      rival.name, v_wins_a, v_wins_b
    ),
    jsonb_build_object('match_id', p_match_id, 'opponent_id', rival.id, 'wins', v_wins_a)
  from public.profiles me
  join public.profiles rival
    on rival.id = case when me.id = v_players[1] then v_players[2] else v_players[1] end
  where me.id in (v_players[1], v_players[2]);
end;
$$;

revoke all on function public.notify_head_to_head_tie(uuid) from public, anon, authenticated;

-- New signature: the game format is part of the request. The set-based version is dropped so no
-- client can keep registering 2×1 / 1×1 results.
drop function public.register_match(uuid, uuid, smallint, smallint);

create or replace function public.register_match(
  p_request_id uuid,
  p_opponent_id uuid,
  p_score_self smallint,
  p_score_opponent smallint,
  p_points_to_win smallint
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

  if not public.is_valid_game_score(p_points_to_win, p_score_self, p_score_opponent) then
    raise exception 'INVALID_SCORE' using errcode = 'P0001';
  end if;

  -- Idempotency: repeated delivery of the same client request returns the same match.
  select m.id into v_existing_id
  from public.matches m
  where m.created_by = v_user_id and m.request_id = p_request_id;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  -- A player with a result waiting for their answer must answer it before registering a new one.
  if exists (
    select 1
    from public.matches m
    join public.match_participants mp on mp.match_id = m.id
    where mp.profile_id = v_user_id
      and m.created_by <> v_user_id
      and m.status = 'pending_confirmation'
  ) then
    raise exception 'PENDING_CONFIRMATION_REQUIRED' using errcode = 'P0001';
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
    -- Tell "not started yet" / "window over" apart from "no season at all".
    if exists (
      select 1 from public.seasons s join public.sports sp on sp.id = s.sport_id
      where sp.slug = 'ping-pong' and s.status = 'active' and now() < s.starts_at
    ) then
      raise exception 'SEASON_NOT_STARTED' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.seasons s join public.sports sp on sp.id = s.sport_id
      where sp.slug = 'ping-pong' and s.status = 'active' and now() >= s.ends_at
    ) then
      raise exception 'SEASON_ENDED' using errcode = 'P0001';
    end if;
    raise exception 'NO_ACTIVE_SEASON' using errcode = 'P0001';
  end if;

  insert into public.matches (season_id, created_by, request_id, points_to_win)
  values (v_season_id, v_user_id, p_request_id, p_points_to_win)
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
    'Um jogo foi registrado contra você. Toque para aceitar ou recusar o placar.',
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

revoke all on function public.register_match(uuid, uuid, smallint, smallint, smallint) from public, anon;
grant execute on function public.register_match(uuid, uuid, smallint, smallint, smallint) to authenticated;

-- Same as the original confirm_match, plus the head-to-head tie check.
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
    'Seu adversário confirmou o jogo. O ranking foi atualizado.',
    jsonb_build_object('match_id', p_match_id)
  );

  perform public.notify_head_to_head_tie(p_match_id);
end;
$$;

-- Same as the previous version, with point-score validation for games and the tie check.
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
    if v_match.points_to_win is not null then
      if not public.is_valid_game_score(v_match.points_to_win, p_score_side_1, p_score_side_2) then
        raise exception 'INVALID_SCORE' using errcode = 'P0001';
      end if;
    elsif not (
      (p_score_side_1 = 2 and p_score_side_2 in (0, 1))
      or (p_score_side_2 = 2 and p_score_side_1 in (0, 1))
      or (p_score_side_1 = 1 and p_score_side_2 = 0)
      or (p_score_side_2 = 1 and p_score_side_1 = 0)
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

  if p_resolution in ('confirm', 'correct_and_confirm') then
    perform public.notify_head_to_head_tie(p_match_id);
  end if;
end;
$$;
