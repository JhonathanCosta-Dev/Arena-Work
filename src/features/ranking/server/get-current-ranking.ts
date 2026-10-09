import 'server-only';

import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { calculateRanking, type ConfirmedMatch } from '../domain/ranking';

// Memoized per request: the app layout (menu leaderboard) and pages share one computation.
export const getCurrentRanking = cache(async function getCurrentRanking(
  supabase: SupabaseClient<Database>,
) {
  const { data: season } = await supabase
    .from('seasons')
    .select('id, name, starts_at, ends_at, sport:sports!inner(id, slug, name)')
    .eq('status', 'active')
    .eq('sports.slug', 'ping-pong')
    .maybeSingle();

  if (!season) return { season: null, ranking: [] };

  const [{ data: profiles }, { data: matches, error }] = await Promise.all([
    supabase.from('profiles').select('id, name, avatar_path').eq('is_active', true),
    supabase
      .from('matches')
      .select(
        `
          id,
          played_at,
          match_sides!inner(
            side,
            score,
            match_participants!inner(profile_id)
          )
        `,
      )
      .eq('season_id', season.id)
      .eq('status', 'confirmed'),
  ]);

  if (error) throw error;

  const domainMatches: ConfirmedMatch[] = (matches ?? []).flatMap((match) => {
    const sides = [...match.match_sides].sort((a, b) => a.side - b.side);
    const sideA = sides[0];
    const sideB = sides[1];
    const playerA = sideA?.match_participants[0]?.profile_id;
    const playerB = sideB?.match_participants[0]?.profile_id;

    if (!sideA || !sideB || !playerA || !playerB) return [];

    return [
      {
        id: match.id,
        playedAt: match.played_at,
        sides: [
          { playerId: playerA, score: sideA.score },
          { playerId: playerB, score: sideB.score },
        ],
      },
    ];
  });

  const rows = calculateRanking(
    (profiles ?? []).map((profile) => profile.id),
    domainMatches,
  );
  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return {
    season,
    ranking: rows.map((row) => ({ ...row, profile: byId.get(row.playerId) ?? null })),
  };
});
