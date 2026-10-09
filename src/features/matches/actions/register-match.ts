'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/require-user';
import { rpcErrorMessage } from '@/lib/errors/rpc-error-message';
import { logger } from '@/lib/logging/logger';
import { createMatchSchema } from '../schemas/create-match';

export type RegisterMatchResult =
  | { ok: true; matchId: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function registerMatch(input: unknown): Promise<RegisterMatchResult> {
  const parsed = createMatchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Confira os dados da partida.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { userId, supabase } = await requireUser();
  if (parsed.data.opponentId === userId) {
    return { ok: false, message: 'Você não pode registrar uma partida contra si mesmo.' };
  }

  const { data, error } = await supabase.rpc('register_match', {
    p_request_id: parsed.data.requestId,
    p_opponent_id: parsed.data.opponentId,
    p_score_self: parsed.data.scoreSelf,
    p_score_opponent: parsed.data.scoreOpponent,
  });

  if (error || !data) {
    logger.warn('match.register_failed', { userId, code: error?.code ?? null });
    return { ok: false, message: rpcErrorMessage(error, 'Não foi possível registrar a partida.') };
  }

  revalidatePath('/', 'layout');
  return { ok: true, matchId: data };
}
