'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/features/admin/actions/action-state';
import { requireUser } from '@/lib/auth/require-user';
import { rpcErrorMessage } from '@/lib/errors/rpc-error-message';
import { MEDIA_BUCKETS } from '@/lib/storage/media';
import { removeReplacedMedia } from '@/lib/storage/remove-replaced';

const optionalPath = z
  .string()
  .trim()
  .max(200)
  .transform((value) => value || null);

const schema = z.object({
  name: z.string().trim().min(2, 'O nome precisa ter pelo menos 2 letras.').max(120),
  avatarPath: optionalPath,
  bannerPath: optionalPath,
});

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    name: formData.get('name') ?? '',
    avatarPath: formData.get('avatarPath') ?? '',
    bannerPath: formData.get('bannerPath') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const { userId, profile, supabase } = await requireUser();

  // The RPC also rejects paths outside the caller's own Storage folder.
  const { error } = await supabase.rpc('update_my_profile', {
    p_name: parsed.data.name,
    p_avatar_path: parsed.data.avatarPath,
    p_banner_path: parsed.data.bannerPath,
  });
  if (error) return { ok: false, message: rpcErrorMessage(error) };

  await removeReplacedMedia(supabase, MEDIA_BUCKETS.profile, [
    [profile.avatar_path, parsed.data.avatarPath],
    [profile.banner_path, parsed.data.bannerPath],
  ]);

  revalidatePath('/', 'layout');
  revalidatePath(`/players/${userId}`);
  return { ok: true, message: 'Perfil atualizado.' };
}
