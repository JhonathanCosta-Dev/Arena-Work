import 'server-only';

import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getMatchesByIds, type MatchSummary } from '@/features/matches/server/get-season-matches';
import type { Database } from '@/types/database.types';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  match: MatchSummary | null;
};

export const countUnreadNotifications = cache(async function countUnreadNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return count ?? 0;
});

export async function getNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, data, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  const matchIdOf = (value: unknown) => {
    const id = (value as { match_id?: unknown } | null)?.match_id;
    return typeof id === 'string' ? id : null;
  };
  const matchIds = [...new Set((data ?? []).map((row) => matchIdOf(row.data)).filter(Boolean))];
  const matches = await getMatchesByIds(supabase, matchIds as string[]);

  return (data ?? []).map((row) => {
    const matchId = matchIdOf(row.data);
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      createdAt: row.created_at,
      readAt: row.read_at,
      match: matchId ? (matches.get(matchId) ?? null) : null,
    };
  });
}
