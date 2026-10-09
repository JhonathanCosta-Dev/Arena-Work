import { z } from 'zod';

export const createMatchSchema = z
  .object({
    requestId: z.uuid(),
    opponentId: z.uuid('Selecione um adversário válido.'),
    scoreSelf: z.number().int().min(0).max(2),
    scoreOpponent: z.number().int().min(0).max(2),
  })
  .superRefine(({ scoreSelf, scoreOpponent }, ctx) => {
    const valid =
      (scoreSelf === 2 && [0, 1].includes(scoreOpponent)) ||
      (scoreOpponent === 2 && [0, 1].includes(scoreSelf));

    if (!valid) {
      ctx.addIssue({
        code: 'custom',
        path: ['scoreSelf'],
        message: 'Use um placar válido: 2×0, 2×1, 0×2 ou 1×2.',
      });
    }
  });

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
