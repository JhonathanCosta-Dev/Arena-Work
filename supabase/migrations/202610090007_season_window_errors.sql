-- Clearer errors when the active season has not started yet or its dates are over.

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
  v_is_draw boolean := p_score_self = 1 and p_score_opponent = 1;
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
    v_is_draw
    or (p_score_self = 2 and p_score_opponent in (0, 1))
    or (p_score_opponent = 2 and p_score_self in (0, 1))
    or (p_score_self = 1 and p_score_opponent = 0)
    or (p_score_opponent = 1 and p_score_self = 0)
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

  insert into public.matches (season_id, created_by, request_id, status)
  values (
    v_season_id,
    v_user_id,
    p_request_id,
    case when v_is_draw then 'drawn'::public.match_status else 'pending_confirmation'::public.match_status end
  )
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

  if v_is_draw then
    -- A draw awards nothing, so it needs no confirmation: both players are told to play the tiebreak.
    insert into public.notifications (user_id, type, title, body, data)
    select
      player_id,
      'match_draw_pending',
      'Empate pendente',
      'A partida terminou 1×1 e não conta no ranking. Joguem o desempate e registrem o resultado.',
      jsonb_build_object('match_id', v_match_id)
    from unnest(array[v_user_id, p_opponent_id]) as player_id;
  else
    insert into public.notifications (user_id, type, title, body, data)
    values (
      p_opponent_id,
      'match_confirmation_requested',
      'Resultado aguardando sua confirmação',
      'Uma partida foi registrada contra você. Toque para aceitar ou recusar o placar.',
      jsonb_build_object('match_id', v_match_id)
    );
  end if;

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
