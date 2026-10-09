import 'server-only';

import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MEDIA_BUCKETS, mediaUrl } from '@/lib/storage/media';
import type { Database } from '@/types/database.types';

export type Company = {
  name: string | null;
  iconPath: string | null;
  bannerPath: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
};

export const getCompany = cache(async function getCompany(
  supabase: SupabaseClient<Database>,
): Promise<Company> {
  const { data } = await supabase
    .from('company_settings')
    .select('name, icon_path, banner_path')
    .eq('id', 1)
    .maybeSingle();

  return {
    name: data?.name ?? null,
    iconPath: data?.icon_path ?? null,
    bannerPath: data?.banner_path ?? null,
    iconUrl: mediaUrl(MEDIA_BUCKETS.company, data?.icon_path),
    bannerUrl: mediaUrl(MEDIA_BUCKETS.company, data?.banner_path),
  };
});
