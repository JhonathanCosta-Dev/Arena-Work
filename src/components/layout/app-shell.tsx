import Link from 'next/link';
import { Bell } from 'lucide-react';
import { ArenaWorkWordmark } from '@/components/brand/arena-work-logo';
import { BottomNav } from './bottom-nav';
import { MenuDrawer, type LeaderboardEntry } from './menu-drawer';

type AppShellProps = {
  children: React.ReactNode;
  userId: string;
  isAdmin: boolean;
  seasonName: string | null;
  leaderboard: LeaderboardEntry[];
  pendingCount: number;
  unreadCount: number;
  company: { name: string | null; iconUrl: string | null };
};

export function AppShell({ children, userId, unreadCount, ...menu }: AppShellProps) {
  return (
    <div className="bg-background text-foreground min-h-dvh">
      <header className="border-border/80 bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <Link
            href="/"
            aria-label="Arena Work, início"
            className="focus-visible:ring-primary rounded-lg focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArenaWorkWordmark />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              aria-label={unreadCount ? `Notificações (${unreadCount} não lidas)` : 'Notificações'}
              className="border-border text-muted-foreground focus-visible:ring-primary relative rounded-full border p-2 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
            >
              <Bell className={`size-4 ${unreadCount ? 'text-white' : ''}`} />
              {unreadCount ? (
                <span className="bg-primary absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full px-1 text-[10px] leading-4 font-black text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </Link>
            <MenuDrawer userId={userId} {...menu} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-28 md:px-8 md:pb-10">{children}</main>

      <BottomNav userId={userId} />
    </div>
  );
}
