const DAY_MS = 24 * 60 * 60 * 1000;

export type SeasonProgress = {
  /** 0..1 share of the season window already elapsed. */
  elapsed: number;
  daysLeft: number;
  hasStarted: boolean;
  hasEnded: boolean;
};

export function seasonProgress(startsAt: string, endsAt: string, now = Date.now()): SeasonProgress {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  const elapsed = Math.min(1, Math.max(0, (now - start) / (end - start)));

  return {
    elapsed,
    daysLeft: Math.max(0, Math.ceil((end - now) / DAY_MS)),
    hasStarted: now >= start,
    hasEnded: now >= end,
  };
}

export type ChaseTarget<T> = { target: T; winsBehind: number };

/**
 * The player right above `playerId` in an ordered ranking and how many wins separate them.
 * Returns null for the leader or a player missing from the ranking.
 */
export function chaseTarget<T extends { playerId: string; wins: number }>(
  ranking: readonly T[],
  playerId: string,
): ChaseTarget<T> | null {
  const index = ranking.findIndex((row) => row.playerId === playerId);
  if (index <= 0) return null;

  const target = ranking[index - 1]!;
  const me = ranking[index]!;
  return { target, winsBehind: Math.max(0, target.wins - me.wins) };
}

/** Holder of the best streak of the season, or null while nobody has won yet. */
export function bestStreakHolder<T extends { bestStreak: number }>(ranking: readonly T[]) {
  return ranking.reduce<T | null>(
    (best, row) => (row.bestStreak > (best?.bestStreak ?? 0) ? row : best),
    null,
  );
}
