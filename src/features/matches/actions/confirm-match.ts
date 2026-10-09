'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/require-user';
import { rpcErrorMessage } from '@/lib/errors/rpc-error-message';
import { logger } from '@/lib/logging/logger';

export async function confirmMatch(matchId: string) {
  const { userId, supabase } = await requireUser();
  const { error } = await supabase.rpc('confirm_match', { p_match_id: matchId });

  if (error) {
    logger.warn('match.confirm_failed', { userId, matchId, code: error.code });
    return { ok: false as const, message: rpcErrorMessage(error) };
  }

  revalidatePath('/', 'layout');
  return { ok: true as const };
}
