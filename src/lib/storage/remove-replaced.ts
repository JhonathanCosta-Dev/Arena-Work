import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logging/logger';
import type { Database } from '@/types/database.types';
import type { MediaBucket } from './media';

/**
 * Deletes objects that were replaced or cleared by a save. Runs with the caller's client, so
 * Storage RLS still decides what may be removed. Failures only leave an orphan file behind.
 */
export async function removeReplacedMedia(
  supabase: SupabaseClient<Database>,
  bucket: MediaBucket,
  pairs: ReadonlyArray<[previous: string | null, next: string | null]>,
) {
  const stale = pairs.flatMap(([previous, next]) =>
    previous && previous !== next ? [previous] : [],
  );
  if (!stale.length) return;

  const { error } = await supabase.storage.from(bucket).remove(stale);
  if (error) logger.warn('storage.remove_replaced_failed', { bucket, count: stale.length });
}
