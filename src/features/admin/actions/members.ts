'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';
import { rpcErrorMessage } from '@/lib/errors/rpc-error-message';
import type { ActionState } from './action-state';

const schema = z.object({
  profileId: z.uuid(),
  active: z.enum(['true', 'false']).transform((value) => value === 'true'),
});

export async function setMemberActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    profileId: formData.get('profileId'),
    active: formData.get('active'),
  });
  if (!parsed.success) return { ok: false, message: 'Dados inválidos.' };

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc('admin_set_profile_active', {
    p_profile_id: parsed.data.profileId,
    p_active: parsed.data.active,
  });
  if (error) return { ok: false, message: rpcErrorMessage(error) };

  revalidatePath('/', 'layout');
  return { ok: true, message: parsed.data.active ? 'Acesso liberado.' : 'Acesso desativado.' };
}
