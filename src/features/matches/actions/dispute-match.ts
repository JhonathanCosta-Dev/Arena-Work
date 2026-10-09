'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/require-user';
import { rpcErrorMessage } from '@/lib/errors/rpc-error-message';

const schema = z.object({
  matchId: z.uuid(),
  reason: z.string().trim().max(500).optional(),
});

export async function disputeMatch(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: 'Dados inválidos.' };

  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('dispute_match', {
    p_match_id: parsed.data.matchId,
    p_reason: parsed.data.reason ?? null,
  });

  if (error) return { ok: false as const, message: rpcErrorMessage(error) };

  revalidatePath('/', 'layout');
  return { ok: true as const };
}
