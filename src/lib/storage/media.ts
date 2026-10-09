import { publicEnv } from '@/lib/env/public';

export const MEDIA_BUCKETS = {
  profile: 'profile-media',
  company: 'company-media',
} as const;

export type MediaBucket = (typeof MEDIA_BUCKETS)[keyof typeof MEDIA_BUCKETS];

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Public URL of an object stored in one of the public media buckets. */
export function mediaUrl(bucket: MediaBucket, path: string | null | undefined) {
  if (!path) return null;
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${encoded}`;
}
