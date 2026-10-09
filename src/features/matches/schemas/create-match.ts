import { z } from 'zod';
import { validatePingPongScore } from '../domain/score';

export const createMatchSchema = z
  .object({
    requestId: z.uuid(),
    opponentId: z.uuid('Selecione um adversário válido.'),
    scoreSelf: z.number().int().min(0).max(2),
    scoreOpponent: z.number().int().min(0).max(2),
  })
  .superRefine(({ scoreSelf, scoreOpponent }, ctx) => {
    try {
      validatePingPongScore(scoreSelf, scoreOpponent);
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: ['scoreSelf'],
        message: 'Use um placar válido: 2×0, 2×1, 1×0 (ou invertido) ou 1×1 para empate.',
      });
    }
  });

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
