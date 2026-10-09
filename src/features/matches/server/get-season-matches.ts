import 'server-only';

import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type MatchStatus = Database['public']['Enums']['match_status'];

export type MatchPlayer = {
  profileId: string;
  name: string;
  score: number;
  avatarPath: string | null;
  badLoser: boolean;
};

export type MatchSummary = {
  id: string;
  status: MatchStatus;
  playedAt: string;
  createdBy: string;
  players: [MatchPlayer, MatchPlayer];
};

const MATCH_SELECT = `
  id,
  status,
  played_at,
  created_by,
  match_sides(side, score, match_participants(profile_id, profile:profiles(name, avatar_path, bad_loser)))
`;

type MatchRow = {
  id: string;
  status: MatchStatus;
  played_at: string;
  created_by: string;
  match_sides: {
    side: number;
    score: number;
    match_participants: {
      profile_id: string;
      profile: { name: string; avatar_path: string | null; bad_loser: boolean } | null;
    }[];
  }[];
};

function toSummary(match: MatchRow): MatchSummary[] {
  const sides = [...match.match_sides].sort((a, b) => a.side - b.side);
  const players = sides.map((side) => {
    const participant = side.match_participants[0];
    return participant
      ? {
          profileId: participant.profile_id,
          name: participant.profile?.name ?? 'Jogador',
          score: side.score,
          avatarPath: participant.profile?.avatar_path ?? null,
          badLoser: participant.profile?.bad_loser ?? false,
        }
      : null;
  });
  const [a, b] = players;
  if (!a || !b) return [];

  return [
    {
      id: match.id,
      status: match.status,
      playedAt: match.played_at,
      createdBy: match.created_by,
      players: [a, b],
    },
  ];
}

/**
 * Matches of a season visible to the current user. RLS already limits pending/disputed matches
 * to their participants (and admins), so partitioning by participant happens on top of that.
 */
export async function getSeasonMatches(
  supabase: SupabaseClient<Database>,
  seasonId: string,
  options: { statuses?: MatchStatus[]; limit?: number } = {},
): Promise<MatchSummary[]> {
  let query = supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('season_id', seasonId)
    .order('played_at', { ascending: false })
    .limit(options.limit ?? 50);

  if (options.statuses) query = query.in('status', options.statuses);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as MatchRow[]).flatMap(toSummary);
}

/** Specific matches (e.g. referenced by notifications), in any season. RLS still applies. */
export async function getMatchesByIds(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, MatchSummary>> {
  if (!ids.length) return new Map();
  const { data, error } = await supabase.from('matches').select(MATCH_SELECT).in('id', ids);
  if (error) throw error;
  return new Map(((data ?? []) as unknown as MatchRow[]).flatMap(toSummary).map((m) => [m.id, m]));
}

export async function getActiveSeason(supabase: SupabaseClient<Database>) {
  const { data } = await supabase
    .from('seasons')
    .select('id, name, starts_at, ends_at, sport:sports!inner(slug)')
    .eq('status', 'active')
    .eq('sports.slug', 'ping-pong')
    .maybeSingle();
  return data;
}

export const countPendingConfirmations = cache(async function countPendingConfirmations(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { count } = await supabase
    .from('matches')
    .select('id, match_participants!inner(profile_id)', { count: 'exact', head: true })
    .eq('status', 'pending_confirmation')
    .neq('created_by', userId)
    .eq('match_participants.profile_id', userId);
  return count ?? 0;
});
