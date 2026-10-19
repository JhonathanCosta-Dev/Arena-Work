export type GameWinner = 'playerA' | 'playerB';

/** A game is played to 11 or 21 points. */
export const POINTS_TO_WIN_OPTIONS = [11, 21] as const;
export type PointsToWin = (typeof POINTS_TO_WIN_OPTIONS)[number];

export const INVALID_SCORE_MESSAGE =
  'Placar inválido. O jogo vai até 11 ou 21 pontos, com 2 de diferença (ex.: 11×7, 12×10, 21×19).';

/**
 * Official rule: the winner reaches the target with at least a 2-point lead; past the target
 * (deuce) the game only ends with exactly 2 points of difference. Mirrors `is_valid_game_score`.
 */
export function validateGameScore(
  pointsToWin: number,
  scoreA: number,
  scoreB: number,
): GameWinner {
  const winner = Math.max(scoreA, scoreB);
  const loser = Math.min(scoreA, scoreB);
  const isValid =
    (POINTS_TO_WIN_OPTIONS as readonly number[]).includes(pointsToWin) &&
    Number.isInteger(scoreA) &&
    Number.isInteger(scoreB) &&
    loser >= 0 &&
    ((winner === pointsToWin && loser <= pointsToWin - 2) ||
      (winner > pointsToWin && loser === winner - 2));

  if (!isValid) throw new Error(INVALID_SCORE_MESSAGE);
  return scoreA > scoreB ? 'playerA' : 'playerB';
}
