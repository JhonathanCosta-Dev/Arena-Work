-- New terminal state for a 1×1 result: recorded, never counted in the ranking.
-- Kept in its own migration: an enum value cannot be used in the transaction that adds it.
alter type public.match_status add value if not exists 'drawn';
