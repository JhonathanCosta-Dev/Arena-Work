import { tierFromPoints, tierGroupIndex, type TierInfo } from './tiers';

export const WIN_POINTS = 25;
export const LOSS_POINTS = 10;
export const STREAK_BONUS_STEP = 5;
export const STREAK_BONUS_CAP = 25;

export type RatedMatch = {
  id: string;
  playedAt: string;
  seasonId: string;
  sides: readonly [{ playerId: string; score: number }, { playerId: string; score: number }];
};

export type CompetitiveStats = {
  playerId: string;
  points: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  /** Wins where the opponent did not take a single set (2×0 or 1×0). */
  flawlessWins: number;
  /** Wins against someone in a higher tier at the time of the match. */
  giantSlayerWins: number;
};

/** Points a win is worth given the streak *including* this win (1 = first win in a row). */
export function winValue(streak: number) {
  return WIN_POINTS + Math.min(STREAK_BONUS_STEP * Math.max(0, streak - 1), STREAK_BONUS_CAP);
}

function emptyStats(playerId: string): CompetitiveStats {
  return {
    playerId,
    points: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    bestStreak: 0,
    flawlessWins: 0,
    giantSlayerWins: 0,
  };
}

export type RatingResult = {
  stats: Map<string, CompetitiveStats>;
  /** Points of every player right after the last match of each season (season id → player → points). */
  pointsAtSeasonEnd: Map<string, Map<string, number>>;
};

/**
 * Replays confirmed matches in chronological order. Competitive points never reset between
 * seasons; drawn/pending/cancelled matches must not be passed in.
 */
export function rateMatches(matches: readonly RatedMatch[]): RatingResult {
  const stats = new Map<string, CompetitiveStats>();
  const pointsAtSeasonEnd = new Map<string, Map<string, number>>();
  const get = (id: string) => {
    let row = stats.get(id);
    if (!row) {
      row = emptyStats(id);
      stats.set(id, row);
    }
    return row;
  };

  const ordered = [...matches].sort(
    (a, b) => a.playedAt.localeCompare(b.playedAt) || a.id.localeCompare(b.id),
  );

  for (const match of ordered) {
    const [left, right] = match.sides;
    if (left.score === right.score) continue;

    const winnerSide = left.score > right.score ? left : right;
    const loserSide = winnerSide === left ? right : left;
    const winner = get(winnerSide.playerId);
    const loser = get(loserSide.playerId);

    const winnerTier = tierGroupIndex(tierFromPoints(winner.points).key);
    const loserTier = tierGroupIndex(tierFromPoints(loser.points).key);

    winner.currentStreak += 1;
    winner.bestStreak = Math.max(winner.bestStreak, winner.currentStreak);
    winner.wins += 1;
    winner.points += winValue(winner.currentStreak);
    if (loserSide.score === 0) winner.flawlessWins += 1;
    if (loserTier > winnerTier) winner.giantSlayerWins += 1;

    loser.losses += 1;
    loser.currentStreak = 0;
    loser.points = Math.max(0, loser.points - LOSS_POINTS);

    // Snapshot after every match of the season: the last write is the season-end value.
    let seasonPoints = pointsAtSeasonEnd.get(match.seasonId);
    if (!seasonPoints) {
      seasonPoints = new Map();
      pointsAtSeasonEnd.set(match.seasonId, seasonPoints);
    }
    for (const row of stats.values()) seasonPoints.set(row.playerId, row.points);
  }

  return { stats, pointsAtSeasonEnd };
}

export type CompetitiveRow = CompetitiveStats & { tier: TierInfo; position: number };

/** Competitive leaderboard: points, then wins, then fewer losses, then id (deterministic). */
export function competitiveRanking(stats: Iterable<CompetitiveStats>): CompetitiveRow[] {
  return [...stats]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        a.losses - b.losses ||
        a.playerId.localeCompare(b.playerId),
    )
    .map((row, index) => ({ ...row, tier: tierFromPoints(row.points), position: index + 1 }));
}
