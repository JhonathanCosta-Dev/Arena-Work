import Link from 'next/link';
import { BadLoserTag } from '@/components/ui/bad-loser-tag';
import { PlayerAvatar } from '@/features/competitive/components/player-badges';
import { TierBadge } from '@/features/competitive/components/tier-emblem';
import { getCompetitive } from '@/features/competitive/server/get-competitive';
import { getCurrentRanking } from '@/features/ranking/server/get-current-ranking';
import { requireUser } from '@/lib/auth/require-user';
import { MEDIA_BUCKETS, mediaUrl } from '@/lib/storage/media';

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ userId, supabase }, { tab }] = await Promise.all([requireUser(), searchParams]);
  const isElo = tab === 'elo';
  const [{ season, ranking }, competitive] = await Promise.all([
    getCurrentRanking(supabase),
    getCompetitive(supabase),
  ]);

  const tabs = [
    { href: '/ranking', label: 'Mês', active: !isElo },
    { href: '/ranking?tab=elo', label: 'Elo geral', active: isElo },
  ];

  return (
    <section>
      <p className="text-primary text-xs font-black tracking-[0.28em]">RANKING</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">
            {isElo ? 'Competitivo' : (season?.name ?? 'Temporada atual')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isElo
              ? 'Pontos acumulados de todas as temporadas. Nunca zera.'
              : 'Vitórias da temporada. Zera todo mês e define o campeão.'}
          </p>
        </div>
        <nav aria-label="Tipo de ranking" className="bg-card grid grid-cols-2 gap-1 rounded-xl p-1">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={t.active ? 'page' : undefined}
              className={`rounded-lg px-4 py-2 text-center text-sm font-bold ${t.active ? 'bg-card-elevated text-white' : 'text-muted-foreground hover:text-white'}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6 space-y-2">
        {isElo
          ? competitive.rows.map((row) => {
              const profile = competitive.profileById.get(row.playerId);
              const name = profile?.name ?? 'Jogador';
              return (
                <Link
                  key={row.playerId}
                  href={`/players/${row.playerId}`}
                  className={`border-border bg-card hover:bg-card-elevated grid grid-cols-[2.25rem_auto_1fr_auto] items-center gap-3 rounded-2xl border p-4 transition ${row.playerId === userId ? 'ring-primary/40 ring-1' : ''}`}
                >
                  <span className="text-muted-foreground font-mono text-lg font-black">
                    #{row.position}
                  </span>
                  <PlayerAvatar
                    playerId={row.playerId}
                    name={name}
                    src={mediaUrl(MEDIA_BUCKETS.profile, profile?.avatar_path)}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-bold">{name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <TierBadge
                        tier={row.tier.key}
                        division={row.tier.division}
                        label={row.tier.label}
                      />
                      {row.currentStreak >= 2 ? (
                        <span className="text-warning text-xs font-black">
                          🔥 {row.currentStreak} seguidas
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right font-mono text-xl font-black">
                    {row.points}
                    <div className="text-muted-foreground text-[10px]">PTS</div>
                  </div>
                </Link>
              );
            })
          : ranking.map((row) => (
              <Link
                key={row.playerId}
                href={`/players/${row.playerId}`}
                className={`border-border bg-card hover:bg-card-elevated grid grid-cols-[2.25rem_auto_1fr_auto] items-center gap-3 rounded-2xl border p-4 transition ${row.playerId === userId ? 'ring-primary/40 ring-1' : ''}`}
              >
                <span className="text-muted-foreground font-mono text-lg font-black">
                  #{row.position}
                </span>
                <PlayerAvatar
                  playerId={row.playerId}
                  name={row.profile?.name ?? 'Jogador'}
                  src={mediaUrl(MEDIA_BUCKETS.profile, row.profile?.avatar_path)}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-bold">
                    {row.profile?.name ?? 'Jogador'}
                    {row.profile?.bad_loser ? <BadLoserTag /> : null}
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {row.wins}V · {row.losses}D · {(row.winRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-right font-mono text-xl font-black">
                  {row.points}
                  <div className="text-muted-foreground text-[10px]">PTS</div>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
}
