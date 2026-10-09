'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';
import { appTimeZone } from '@/lib/dates';
import { rpcErrorMessage } from '@/lib/errors/rpc-error-message';
import type { ActionState } from './action-state';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.');

const seasonSchema = z
  .object({
    seasonId: z.uuid().optional(),
    name: z.string().trim().min(1, 'Informe o nome.').max(80),
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine(({ startDate, endDate }) => endDate >= startDate, {
    message: 'A data de fim precisa ser igual ou posterior à de início.',
  });

const seasonIdSchema = z.object({ seasonId: z.uuid() });

function done(message: string): ActionState {
  revalidatePath('/', 'layout');
  return { ok: true, message };
}

export async function saveSeasonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = seasonSchema.safeParse({
    seasonId: formData.get('seasonId') || undefined,
    name: formData.get('name'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const { supabase } = await requireAdmin();
  const { seasonId, name, startDate, endDate } = parsed.data;

  const { error } = seasonId
    ? await supabase.rpc('admin_update_season', {
        p_season_id: seasonId,
        p_name: name,
        p_start_date: startDate,
        p_end_date: endDate,
        p_timezone: appTimeZone,
      })
    : await supabase.rpc('admin_create_season', {
        p_name: name,
        p_start_date: startDate,
        p_end_date: endDate,
        p_timezone: appTimeZone,
      });

  if (error) return { ok: false, message: rpcErrorMessage(error) };
  return done(
    seasonId ? 'Temporada atualizada.' : 'Temporada criada. Ative-a quando quiser começar.',
  );
}

export async function startSeasonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = seasonIdSchema.safeParse({ seasonId: formData.get('seasonId') });
  if (!parsed.success) return { ok: false, message: 'Temporada inválida.' };

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc('admin_start_season', { p_season_id: parsed.data.seasonId });
  if (error) return { ok: false, message: rpcErrorMessage(error) };
  return done('Temporada ativada.');
}

export async function finishSeasonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = seasonIdSchema.safeParse({ seasonId: formData.get('seasonId') });
  if (!parsed.success) return { ok: false, message: 'Temporada inválida.' };

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc('admin_finish_season', {
    p_season_id: parsed.data.seasonId,
  });
  if (error) return { ok: false, message: rpcErrorMessage(error) };
  return done('Temporada encerrada.');
}
