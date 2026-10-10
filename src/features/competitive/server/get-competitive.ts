import 'server-only';

import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateRanking } from '@/features/ranking/domain/ranking';
import type { Database } from '@/types/database.types';
import { earnedAchievements, type AchievementKey } from '../domain/achievements';
import {
  competitiveRanking,
  rateMatches,
  type CompetitiveRow,
  type RatedMatch,
} from '../domain/rating';
import { tierFromPoints, type TierInfo, type TierKey } from '../domain/tiers';

const PAGE = 1000;

type SideRow = { side: number; score: number; match_participants: { profile_id: string }[] };
type MatchRow = { id: string; season_id: string; played_at: string; match_sides: SideRow[] };

async function confirmedMatches(supabase: SupabaseClient<Database>): Promise<RatedMatch[]> {
  const all: RatedMatch[] = [];
  // PostgREST caps responses (1000 rows by default), so page through the whole history.
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('matches')
      .select('id, season_id, played_at, match_sides(side, score, match_participants(profile_id))')
      .eq('status', 'confirmed')
      .order('played_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;

    for (const row of (data ?? []) as unknown as MatchRow[]) {
      const sides = [...row.match_sides].sort((a, b) => a.side - b.side);
      const a = sides[0];
      const b = sides[1];
      const pa = a?.match_participants[0]?.profile_id;
      const pb = b?.match_participants[0]?.profile_id;
      if (!a || !b || !pa || !pb) continue;
      all.push({
        id: row.id,
        seasonId: row.season_id,
        playedAt: row.played_at,
        sides: [
          { playerId: pa, score: a.score },
          { playerId: pb, score: b.score },
        ],
      });
    }
    if (!data || data.length < PAGE) break;
  }
  return all;
}

export type SeasonMedal = { seasonId: string; seasonName: string; endsAt: string; tier: TierInfo };

export type PlayerCompetitive = {
  row: CompetitiveRow | null;
  tier: TierInfo;
  earned: Set<AchievementKey>;
  championships: number;
  medals: SeasonMedal[];
};

export type Champion = {
  playerId: string;
  name: string;
  avatarPath: string | null;
  seasonName: string;
  wins: number;
  losses: number;
};

/** Small, serializable view used by client components (avatar borders, badges). */
export type PlayerBadgeMap = Record<
  string,
  { tier: TierKey; tierLabel: string; champion: boolean }
>;

export const getCompetitive = cache(async function getCompetitive(
  supabase: SupabaseClient<Database>,
) {
  const [matches, { data: seasons }, { data: profiles }] = await Promise.all([
    confirmedMatches(supabase),
    supabase
      .from('seasons')
      .select('id, name, status, ends_at')
      .order('ends_at', { ascending: true }),
    supabase.from('profiles').select('id, name, avatar_path, bad_loser, is_active'),
  ]);

  const { stats, pointsAtSeasonEnd } = rateMatches(matches);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Active players appear in the competitive ladder even before their first match.
  for (const profile of profiles ?? []) {
    if (profile.is_active && !stats.has(profile.id)) {
      stats.set(profile.id, {
        playerId: profile.id,
        points: 0,
        wins: 0,
        losses: 0,
        currentStreak: 0,
        bestStreak: 0,
        flawlessWins: 0,
        giantSlayerWins: 0,
      });
    }
  }
  const rows = competitiveRanking(
    [...stats.values()].filter((row) => profileById.get(row.playerId)?.is_active),
  );
  const rowById = new Map(rows.map((row) => [row.playerId, row]));

  // Monthly champions: 1st place of each finished season's wins ranking.
  const finished = (seasons ?? []).filter((s) => s.status === 'finished');
  const championships = new Map<string, number>();
  let champion: Champion | null = null;
  const medalsByPlayer = new Map<string, SeasonMedal[]>();

  for (const season of finished) {
    const seasonMatches = matches.filter((m) => m.seasonId === season.id);
    if (!seasonMatches.length) continue;

    const standings = calculateRanking(
      [],
      seasonMatches.map((m) => ({ id: m.id, playedAt: m.playedAt, sides: m.sides })),
    );
    const top = standings[0];
    if (top) {
      championships.set(top.playerId, (championships.get(top.playerId) ?? 0) + 1);
      const profile = profileById.get(top.playerId);
      champion = {
        playerId: top.playerId,
        name: profile?.name ?? 'Jogador',
        avatarPath: profile?.avatar_path ?? null,
        seasonName: season.name,
        wins: top.wins,
        losses: top.losses,
      };
    }

    // The medal of the month is the competitive tier at the end of that season.
    const endPoints = pointsAtSeasonEnd.get(season.id);
    const played = new Set(seasonMatches.flatMap((m) => m.sides.map((s) => s.playerId)));
    for (const playerId of played) {
      const list = medalsByPlayer.get(playerId) ?? [];
      list.push({
        seasonId: season.id,
        seasonName: season.name,
        endsAt: season.ends_at,
        tier: tierFromPoints(endPoints?.get(playerId) ?? 0),
      });
      medalsByPlayer.set(playerId, list);
    }
  }

  const player = (playerId: string): PlayerCompetitive => {
    const row = rowById.get(playerId) ?? null;
    const raw = stats.get(playerId);
    return {
      row,
      tier: tierFromPoints(raw?.points ?? 0),
      earned: earnedAchievements(raw, championships.get(playerId) ?? 0),
      championships: championships.get(playerId) ?? 0,
      medals: [...(medalsByPlayer.get(playerId) ?? [])].reverse(),
    };
  };

  const badges: PlayerBadgeMap = {};
  for (const [playerId, raw] of stats) {
    const tier = tierFromPoints(raw.points);
    badges[playerId] = {
      tier: tier.key,
      tierLabel: tier.label,
      champion: champion?.playerId === playerId,
    };
  }

  return { rows, player, champion, badges, profileById };
});
