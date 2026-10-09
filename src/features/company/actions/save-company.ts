'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/features/admin/actions/action-state';
import { requireAdmin } from '@/lib/auth/require-admin';
import { rpcErrorMessage } from '@/lib/errors/rpc-error-message';
import { MEDIA_BUCKETS } from '@/lib/storage/media';
import { removeReplacedMedia } from '@/lib/storage/remove-replaced';

const optionalPath = z
  .string()
  .trim()
  .transform((value) => value || null)
  .pipe(z.string().startsWith('company/').max(200).nullable());

const schema = z.object({
  name: z
    .string()
    .trim()
    .max(80, 'O nome pode ter até 80 caracteres.')
    .transform((value) => value || null),
  iconPath: optionalPath,
  bannerPath: optionalPath,
});

export async function saveCompanyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    name: formData.get('name') ?? '',
    iconPath: formData.get('iconPath') ?? '',
    bannerPath: formData.get('bannerPath') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const { supabase } = await requireAdmin();
  const { data: previous } = await supabase
    .from('company_settings')
    .select('icon_path, banner_path')
    .eq('id', 1)
    .maybeSingle();

  const { error } = await supabase.rpc('admin_update_company', {
    p_name: parsed.data.name,
    p_icon_path: parsed.data.iconPath,
    p_banner_path: parsed.data.bannerPath,
  });
  if (error) return { ok: false, message: rpcErrorMessage(error) };

  await removeReplacedMedia(supabase, MEDIA_BUCKETS.company, [
    [previous?.icon_path ?? null, parsed.data.iconPath],
    [previous?.banner_path ?? null, parsed.data.bannerPath],
  ]);

  revalidatePath('/', 'layout');
  return { ok: true, message: 'Dados da empresa salvos.' };
}
