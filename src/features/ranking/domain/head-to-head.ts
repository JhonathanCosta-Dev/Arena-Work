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
