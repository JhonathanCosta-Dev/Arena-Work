export type ConfirmedMatch = {
  id: string;
  playedAt: string;
  sides: readonly [{ playerId: string; score: number }, { playerId: string; score: number }];
};

export type RankingRow = {
  playerId: string;
  points: number;
  wins: number;
  losses: number;
  matches: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
};

export type RankedRow = RankingRow & { position: number };

const WIN_POINTS = 3;

function emptyRow(playerId: string): RankingRow {
  return {
    playerId,
    points: 0,
    wins: 0,
    losses: 0,
    matches: 0,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}

function samePrimaryTie(a: RankingRow, b: RankingRow) {
  return a.wins === b.wins && a.winRate === b.winRate;
}

function headToHeadWins(
  playerId: string,
  tiedPlayerIds: ReadonlySet<string>,
  matches: readonly ConfirmedMatch[],
) {
  let wins = 0;

  for (const match of matches) {
    const [left, right] = match.sides;
    if (!tiedPlayerIds.has(left.playerId) || !tiedPlayerIds.has(right.playerId)) continue;

    const winnerId = left.score > right.score ? left.playerId : right.playerId;
    if (winnerId === playerId) wins += 1;
  }

  return wins;
}

function sortTieGroup(group: RankingRow[], matches: readonly ConfirmedMatch[]): RankingRow[] {
  if (group.length <= 1) return group;

  const playerIds = new Set(group.map((row) => row.playerId));
  const headToHead = new Map(
    group.map((row) => [row.playerId, headToHeadWins(row.playerId, playerIds, matches)]),
  );

  return [...group].sort((a, b) => {
    const aHeadToHead = headToHead.get(a.playerId) ?? 0;
    const bHeadToHead = headToHead.get(b.playerId) ?? 0;
    if (aHeadToHead !== bHeadToHead) return bHeadToHead - aHeadToHead;

    if (a.losses !== b.losses) return a.losses - b.losses;

    // Deterministic technical fallback for live standings. Administrative ordering, when
    // explicitly necessary, belongs only to the audited immutable season snapshot.
    return a.playerId.localeCompare(b.playerId);
  });
}

export function calculateRanking(
  playerIds: readonly string[],
  matches: readonly ConfirmedMatch[],
): RankedRow[] {
  const rows = new Map(playerIds.map((id) => [id, emptyRow(id)]));
  const orderedMatches = [...matches].sort((a, b) => a.playedAt.localeCompare(b.playedAt));

  for (const match of orderedMatches) {
    const [left, right] = match.sides;
    if (left.score === right.score) {
      throw new Error(`Confirmed match ${match.id} cannot be tied.`);
    }

    if (!rows.has(left.playerId)) rows.set(left.playerId, emptyRow(left.playerId));
    if (!rows.has(right.playerId)) rows.set(right.playerId, emptyRow(right.playerId));

    const winnerId = left.score > right.score ? left.playerId : right.playerId;
    const loserId = winnerId === left.playerId ? right.playerId : left.playerId;
    const winner = rows.get(winnerId)!;
    const loser = rows.get(loserId)!;

    winner.matches += 1;
    winner.wins += 1;
    winner.points += WIN_POINTS;
    winner.currentStreak += 1;
    winner.bestStreak = Math.max(winner.bestStreak, winner.currentStreak);

    loser.matches += 1;
    loser.losses += 1;
    loser.currentStreak = 0;
  }

  for (const row of rows.values()) {
    row.winRate = row.matches === 0 ? 0 : row.wins / row.matches;
  }

  const primarilySorted = [...rows.values()].sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins;
    if (a.winRate !== b.winRate) return b.winRate - a.winRate;
    return 0;
  });

  const resolved: RankingRow[] = [];
  let start = 0;

  while (start < primarilySorted.length) {
    const current = primarilySorted[start];
    if (!current) break;

    let end = start + 1;
    while (end < primarilySorted.length) {
      const candidate = primarilySorted[end];
      if (!candidate || !samePrimaryTie(current, candidate)) break;
      end += 1;
    }

    resolved.push(...sortTieGroup(primarilySorted.slice(start, end), orderedMatches));
    start = end;
  }

  return resolved.map((row, index) => ({ ...row, position: index + 1 }));
}
