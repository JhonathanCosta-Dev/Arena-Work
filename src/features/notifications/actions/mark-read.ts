'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/require-user';

export async function markNotificationRead(notificationId: string) {
  if (!z.uuid().safeParse(notificationId).success) return;
  const { supabase } = await requireUser();
  await supabase.rpc('mark_notification_read', { p_notification_id: notificationId });
  revalidatePath('/', 'layout');
}

export async function markAllNotificationsRead() {
  const { supabase } = await requireUser();
  await supabase.rpc('mark_all_notifications_read');
  revalidatePath('/', 'layout');
}
