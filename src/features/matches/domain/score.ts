export type MatchWinner = 'playerA' | 'playerB';

export function validatePingPongScore(scoreA: number, scoreB: number): MatchWinner {
  const valid =
    (scoreA === 2 && (scoreB === 0 || scoreB === 1)) ||
    (scoreB === 2 && (scoreA === 0 || scoreA === 1));

  if (!valid) {
    throw new Error('Placar inválido. No formato atual, a partida termina em 2x0 ou 2x1.');
  }

  return scoreA > scoreB ? 'playerA' : 'playerB';
}
