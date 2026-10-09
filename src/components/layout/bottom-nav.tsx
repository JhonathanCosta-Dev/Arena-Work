'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { CirclePlus, History, Home, Medal, UserRound, type LucideIcon } from 'lucide-react';

type NavItem = { href: string; label: string; icon: LucideIcon; primary?: boolean };

/** Icon that pulses while its link's navigation is pending: instant feedback on slow networks. */
function NavIcon({ icon: Icon, primary }: { icon: LucideIcon; primary?: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <Icon
      className={`${primary ? 'size-5' : 'size-4'} ${pending ? 'animate-pulse' : ''}`}
      aria-hidden="true"
    />
  );
}

export function BottomNav({ userId }: { userId: string }) {
  const pathname = usePathname();
  const items: NavItem[] = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/ranking', label: 'Ranking', icon: Medal },
    { href: '/matches/new', label: 'Registrar', icon: CirclePlus, primary: true },
    { href: '/matches', label: 'Partidas', icon: History },
    { href: `/players/${userId}`, label: 'Perfil', icon: UserRound },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="border-border bg-card/95 fixed inset-x-0 bottom-0 z-40 border-t px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5 items-end gap-1">
        {items.map(({ href, label, icon, primary }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={
                  primary
                    ? 'bg-primary text-primary-foreground flex min-h-14 -translate-y-3 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold shadow-[0_10px_30px_rgba(255,0,0,.25)] transition active:scale-95'
                    : `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] transition active:scale-95 active:bg-white/5 ${
                        active
                          ? 'text-primary font-bold'
                          : 'text-muted-foreground font-medium hover:text-white'
                      }`
                }
              >
                <NavIcon icon={icon} primary={primary ?? false} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
