import Link from 'next/link';
import { Bell, CirclePlus, History, Home, Medal, UserRound, type LucideIcon } from 'lucide-react';
import { ArenaWorkWordmark } from '@/components/brand/arena-work-logo';
import { MenuDrawer, type LeaderboardEntry } from './menu-drawer';

type NavItem = { href: string; label: string; icon: LucideIcon; primary?: boolean };

const nav: readonly NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/ranking', label: 'Ranking', icon: Medal },
  { href: '/matches/new', label: 'Registrar', icon: CirclePlus, primary: true },
  { href: '/matches', label: 'Partidas', icon: History },
];

type AppShellProps = {
  children: React.ReactNode;
  userId: string;
  isAdmin: boolean;
  seasonName: string | null;
  leaderboard: LeaderboardEntry[];
  pendingCount: number;
  company: { name: string | null; iconUrl: string | null };
};

export function AppShell({ children, userId, ...menu }: AppShellProps) {
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
              aria-label="Notificações"
              className="border-border text-muted-foreground focus-visible:ring-primary rounded-full border p-2 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
            >
              <Bell className="size-4" />
            </Link>
            <MenuDrawer userId={userId} {...menu} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 pb-28 md:px-8 md:pb-10">{children}</main>

      <nav
        aria-label="Navegação principal"
        className="border-border bg-card/95 fixed inset-x-0 bottom-0 z-40 border-t px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5 items-end gap-1">
          {nav.map(({ href, label, icon: Icon, primary }) => (
            <li key={href}>
              <Link
                href={href}
                className={
                  primary
                    ? 'bg-primary text-primary-foreground flex min-h-14 -translate-y-3 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold shadow-[0_10px_30px_rgba(255,0,0,.25)]'
                    : 'text-muted-foreground flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium hover:text-white'
                }
              >
                <Icon className={primary ? 'size-5' : 'size-4'} aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={`/players/${userId}`}
              className="text-muted-foreground flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium hover:text-white"
            >
              <UserRound className="size-4" aria-hidden="true" />
              Perfil
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
