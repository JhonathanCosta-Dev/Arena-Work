-- Hardening after Supabase advisors. No business rule changes.

-- Functions get EXECUTE for PUBLIC by default. RLS helpers must stay callable by `authenticated`
-- (policies run as the caller), but never by `anon`.
revoke all on function public.current_user_is_active() from public, anon;
revoke all on function public.current_user_is_admin() from public, anon;
revoke all on function public.is_match_participant(uuid, uuid) from public, anon;
revoke all on function public.can_view_match(uuid) from public, anon;

grant execute on function public.current_user_is_active() to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.is_match_participant(uuid, uuid) to authenticated;
grant execute on function public.can_view_match(uuid) to authenticated;

-- Trigger-only function: firing a trigger does not check EXECUTE, so nobody needs it via the API.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Covering indexes for foreign keys (FK checks on delete/update and admin lookups).
create index if not exists seasons_created_by_idx on public.seasons (created_by);
create index if not exists matches_confirmed_by_idx on public.matches (confirmed_by);
create index if not exists matches_cancelled_by_idx on public.matches (cancelled_by);
create index if not exists match_disputes_opened_by_idx on public.match_disputes (opened_by);
create index if not exists match_disputes_resolved_by_idx on public.match_disputes (resolved_by);

-- The composite FK (side_id, match_id) needs a matching index; it supersedes the side_id-only one.
create index if not exists match_participants_side_match_idx
  on public.match_participants (side_id, match_id);
drop index if exists public.match_participants_side_idx;
