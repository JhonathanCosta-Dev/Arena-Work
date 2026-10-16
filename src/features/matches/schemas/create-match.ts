import { z } from 'zod';
import { INVALID_SCORE_MESSAGE, validateGameScore } from '../domain/score';

export const createMatchSchema = z
  .object({
    requestId: z.uuid(),
    opponentId: z.uuid('Selecione um adversário válido.'),
    pointsToWin: z.union([z.literal(11), z.literal(21)]),
    scoreSelf: z.number('Informe os pontos.').int().min(0).max(99),
    scoreOpponent: z.number('Informe os pontos.').int().min(0).max(99),
  })
  .superRefine(({ pointsToWin, scoreSelf, scoreOpponent }, ctx) => {
    try {
      validateGameScore(pointsToWin, scoreSelf, scoreOpponent);
    } catch {
      ctx.addIssue({ code: 'custom', path: ['scoreSelf'], message: INVALID_SCORE_MESSAGE });
    }
  });

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
