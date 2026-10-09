'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';
import { rpcErrorMessage } from '@/lib/errors/rpc-error-message';
import type { ActionState } from './action-state';

const schema = z.object({
  matchId: z.uuid(),
  resolution: z.enum(['confirm', 'cancel']),
});

export async function resolveDisputeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    matchId: formData.get('matchId'),
    resolution: formData.get('resolution'),
  });
  if (!parsed.success) return { ok: false, message: 'Dados inválidos.' };

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc('admin_resolve_dispute', {
    p_match_id: parsed.data.matchId,
    p_resolution: parsed.data.resolution,
  });
  if (error) return { ok: false, message: rpcErrorMessage(error) };

  revalidatePath('/', 'layout');
  return {
    ok: true,
    message: parsed.data.resolution === 'confirm' ? 'Resultado confirmado.' : 'Partida cancelada.',
  };
}
