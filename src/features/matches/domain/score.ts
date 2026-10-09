export type MatchOutcome = 'playerA' | 'playerB' | 'draw';

/** Wins: 2×0, 2×1 (best of 3) or 1×0 (single game). A 1×1 is a pending draw. */
export function validatePingPongScore(scoreA: number, scoreB: number): MatchOutcome {
  const isWin = (winner: number, loser: number) =>
    (winner === 2 && (loser === 0 || loser === 1)) || (winner === 1 && loser === 0);

  if (scoreA === 1 && scoreB === 1) return 'draw';
  if (isWin(scoreA, scoreB)) return 'playerA';
  if (isWin(scoreB, scoreA)) return 'playerB';

  throw new Error('Placar inválido. Use 2×0, 2×1, 1×0 ou 1×1 (empate).');
}
