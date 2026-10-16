import type { ConfirmedMatch } from './ranking';

export type HeadToHead = {
  totalMatches: number;
  playerAWins: number;
  playerBWins: number;
  recentMatches: ConfirmedMatch[];
};

export function getHeadToHead(
  playerA: string,
  playerB: string,
  matches: readonly ConfirmedMatch[],
  recentLimit = 5,
): HeadToHead {
  const relevant = matches
    .filter((match) => {
      const ids = match.sides.map((side) => side.playerId);
      return ids.includes(playerA) && ids.includes(playerB);
    })
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt));

  let playerAWins = 0;
  let playerBWins = 0;

  for (const match of relevant) {
    const [left, right] = match.sides;
    const winner = left.score > right.score ? left.playerId : right.playerId;
    if (winner === playerA) playerAWins += 1;
    if (winner === playerB) playerBWins += 1;
  }

  return {
    totalMatches: relevant.length,
    playerAWins,
    playerBWins,
    recentMatches: relevant.slice(0, recentLimit),
  };
}

export type OpponentRecord = {
  opponentId: string;
  /** Wins of the player whose history is being read. */
  wins: number;
  losses: number;
  total: number;
  lastPlayedAt: string;
};

/**
 * Head-to-head record of `playerId` against everyone they faced, most played first
 * (ties: most recent first). Matches without `playerId` are ignored.
 */
export function opponentRecords(
  playerId: string,
  matches: readonly ConfirmedMatch[],
): OpponentRecord[] {
  const records = new Map<string, OpponentRecord>();

  for (const match of matches) {
    const me = match.sides.find((side) => side.playerId === playerId);
    const rival = match.sides.find((side) => side.playerId !== playerId);
    if (!me || !rival || me.score === rival.score) continue;

    const record = records.get(rival.playerId) ?? {
      opponentId: rival.playerId,
      wins: 0,
      losses: 0,
      total: 0,
      lastPlayedAt: match.playedAt,
    };
    if (me.score > rival.score) record.wins += 1;
    else record.losses += 1;
    record.total += 1;
    if (match.playedAt > record.lastPlayedAt) record.lastPlayedAt = match.playedAt;
    records.set(rival.playerId, record);
  }

  return [...records.values()].sort(
    (a, b) => b.total - a.total || b.lastPlayedAt.localeCompare(a.lastPlayedAt),
  );
}
