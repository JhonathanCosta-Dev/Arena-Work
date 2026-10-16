'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/require-user';

/** Called when the notifications page is opened: everything listed there counts as seen. */
export async function markAllNotificationsRead() {
  const { supabase } = await requireUser();
  await supabase.rpc('mark_all_notifications_read');
  revalidatePath('/', 'layout');
}
