'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  CirclePlus,
  History,
  Home,
  LogOut,
  Medal,
  Menu,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { BadLoserTag } from '@/components/ui/bad-loser-tag';
import { logoutAction } from '@/features/auth/actions/logout';
import { PlayerAvatar } from '@/features/competitive/components/player-badges';
import { TierBadge } from '@/features/competitive/components/tier-emblem';
import type { TierKey } from '@/features/competitive/domain/tiers';

export type LeaderboardEntry = {
  playerId: string;
  position: number;
  name: string;
  points: number;
  wins: number;
  losses: number;
  avatarUrl: string | null;
  badLoser: boolean;
};

export type CompetitiveEntry = {
  playerId: string;
  position: number;
  name: string;
  points: number;
  streak: number;
  tier: TierKey;
  division: 1 | 2 | 3;
  tierLabel: string;
  avatarUrl: string | null;
};

type MenuDrawerProps = {
  userId: string;
  isAdmin: boolean;
  seasonName: string | null;
  leaderboard: LeaderboardEntry[];
  competitive: CompetitiveEntry[];
  pendingCount: number;
  company: { name: string | null; iconUrl: string | null };
};

export function MenuDrawer({
  userId,
  isAdmin,
  seasonName,
  leaderboard,
  competitive,
  pendingCount,
  company,
}: MenuDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const [board, setBoard] = useState<'month' | 'competitive'>('month');

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const links: { href: string; label: string; icon: LucideIcon; badge?: number }[] = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/matches/new', label: 'Registrar partida', icon: CirclePlus },
    { href: '/matches', label: 'Partidas', icon: History, badge: pendingCount },
    { href: '/ranking', label: 'Ranking completo', icon: Medal },
    { href: '/notifications', label: 'Notificações', icon: Bell },
    { href: `/players/${userId}`, label: 'Meu perfil', icon: UserRound },
    ...(isAdmin ? [{ href: '/admin', label: 'Painel admin', icon: ShieldCheck }] : []),
  ];

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menu"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className="border-border text-muted-foreground focus-visible:ring-primary relative rounded-full border p-2 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
      >
        <Menu className="size-4" />
        {pendingCount ? (
          <span className="bg-primary absolute -top-1 -right-1 grid size-4 place-items-center rounded-full text-[10px] font-black text-white">
            {pendingCount}
          </span>
        ) : null}
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Menu"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="border-border bg-card text-foreground fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(24rem,100vw)] max-w-none overflow-y-auto border-l p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="flex min-h-full flex-col gap-6 p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
          <div className="flex items-center justify-between">
            {company.name || company.iconUrl ? (
              <div className="flex min-w-0 items-center gap-2">
                {company.iconUrl ? (
                  <Avatar name={company.name ?? ''} src={company.iconUrl} size="sm" />
                ) : null}
                <span className="truncate text-sm font-black">{company.name}</span>
              </div>
            ) : (
              <p className="text-primary text-xs font-black tracking-[0.28em]">MENU</p>
            )}
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => dialogRef.current?.close()}
              className="border-border text-muted-foreground rounded-full border p-2 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>

          <section
            aria-labelledby="leaderboard-title"
            className="border-border bg-background rounded-2xl border p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] font-black tracking-[0.28em]">
                  LEADERBOARD
                </p>
                <h2 id="leaderboard-title" className="mt-1 truncate text-lg font-black">
                  {board === 'month' ? (seasonName ?? 'Sem temporada ativa') : 'Competitivo'}
                </h2>
              </div>
              <div
                role="tablist"
                aria-label="Tipo de ranking"
                className="bg-card grid shrink-0 grid-cols-2 gap-1 rounded-lg p-1 text-[11px] font-bold"
              >
                {(
                  [
                    ['month', 'Mês'],
                    ['competitive', 'Elo'],
                  ] as const
                ).map(([key, text]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={board === key}
                    onClick={() => setBoard(key)}
                    className={`rounded-md px-2 py-1 ${board === key ? 'bg-card-elevated text-white' : 'text-muted-foreground'}`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            {board === 'month' ? (
              leaderboard.length ? (
                <ol className="mt-4 space-y-1">
                  {leaderboard.map((row) => {
                    const isYou = row.playerId === userId;
                    return (
                      <li key={row.playerId}>
                        <Link
                          href={`/players/${row.playerId}`}
                          className={`hover:bg-card-elevated grid grid-cols-[1.75rem_auto_1fr_auto] items-center gap-2 rounded-xl px-2 py-2 ${isYou ? 'bg-primary/10 ring-primary/40 ring-1' : ''}`}
                        >
                          <span
                            className={`font-mono text-sm font-black ${row.position <= 3 ? 'text-primary' : 'text-muted-foreground'}`}
                          >
                            {row.position}º
                          </span>
                          <PlayerAvatar
                            playerId={row.playerId}
                            name={row.name}
                            src={row.avatarUrl}
                            size="sm"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold">
                              {row.name}
                              {isYou ? (
                                <span className="text-muted-foreground"> (você)</span>
                              ) : null}
                              {row.badLoser ? (
                                <span className="ml-1 align-middle">
                                  <BadLoserTag compact />
                                </span>
                              ) : null}
                            </span>
                            <span className="text-muted-foreground block text-[11px]">
                              {row.wins}V · {row.losses}D
                            </span>
                          </span>
                          <span className="font-mono text-base font-black">
                            {row.points}
                            <span className="text-muted-foreground ml-1 text-[10px]">PTS</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-muted-foreground mt-3 text-sm">
                  Nenhum jogador no ranking ainda.
                </p>
              )
            ) : (
              <ol className="mt-4 space-y-1">
                {competitive.map((row) => {
                  const isYou = row.playerId === userId;
                  return (
                    <li key={row.playerId}>
                      <Link
                        href={`/players/${row.playerId}`}
                        className={`hover:bg-card-elevated grid grid-cols-[1.75rem_auto_1fr_auto] items-center gap-2 rounded-xl px-2 py-2 ${isYou ? 'bg-primary/10 ring-primary/40 ring-1' : ''}`}
                      >
                        <span className="text-muted-foreground font-mono text-sm font-black">
                          {row.position}º
                        </span>
                        <PlayerAvatar
                          playerId={row.playerId}
                          name={row.name}
                          src={row.avatarUrl}
                          size="sm"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">
                            {row.name}
                            {isYou ? <span className="text-muted-foreground"> (você)</span> : null}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1">
                            <TierBadge
                              tier={row.tier}
                              division={row.division}
                              label={row.tierLabel}
                            />
                            {row.streak >= 2 ? (
                              <span className="text-warning text-[11px] font-black">
                                🔥{row.streak}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span className="font-mono text-base font-black">
                          {row.points}
                          <span className="text-muted-foreground ml-1 text-[10px]">PTS</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <nav aria-label="Menu principal">
            <ul className="space-y-1">
              {links.map(({ href, label, icon: Icon, badge }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={pathname === href ? 'page' : undefined}
                    className="text-muted-foreground hover:bg-card-elevated aria-[current=page]:bg-card-elevated flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold hover:text-white aria-[current=page]:text-white"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    {badge ? (
                      <span className="bg-primary rounded-full px-2 py-0.5 text-[10px] font-black text-white">
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <form action={logoutAction} className="mt-auto">
            <button
              type="submit"
              className="text-muted-foreground hover:bg-card-elevated flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold hover:text-white"
            >
              <LogOut className="size-4" aria-hidden="true" /> Sair
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
