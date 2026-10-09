import { AppShell } from '@/components/layout/app-shell';
import { getCompany } from '@/features/company/server/get-company';
import { countUnreadNotifications } from '@/features/notifications/server/get-notifications';
import { countPendingConfirmations } from '@/features/matches/server/get-season-matches';
import { getCurrentRanking } from '@/features/ranking/server/get-current-ranking';
import { requireUser } from '@/lib/auth/require-user';
import { MEDIA_BUCKETS, mediaUrl } from '@/lib/storage/media';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile, supabase } = await requireUser();
  const [{ season, ranking }, pendingCount, company, unreadCount] = await Promise.all([
    getCurrentRanking(supabase),
    countPendingConfirmations(supabase, userId),
    getCompany(supabase),
    countUnreadNotifications(supabase, userId),
  ]);

  return (
    <AppShell
      userId={userId}
      isAdmin={profile.role === 'admin'}
      seasonName={season?.name ?? null}
      pendingCount={pendingCount}
      unreadCount={unreadCount}
      company={{ name: company.name, iconUrl: company.iconUrl }}
      leaderboard={ranking.map((row) => ({
        playerId: row.playerId,
        position: row.position,
        name: row.profile?.name ?? 'Jogador',
        points: row.points,
        wins: row.wins,
        losses: row.losses,
        avatarUrl: mediaUrl(MEDIA_BUCKETS.profile, row.profile?.avatar_path),
        badLoser: row.profile?.bad_loser ?? false,
      }))}
    >
      {children}
    </AppShell>
  );
}
