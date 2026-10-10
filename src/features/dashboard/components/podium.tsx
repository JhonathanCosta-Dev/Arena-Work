import Link from 'next/link';
import { BadLoserTag } from '@/components/ui/bad-loser-tag';
import { PlayerAvatar } from '@/features/competitive/components/player-badges';
import type { RankedRow } from '@/features/ranking/domain/ranking';
import { MEDIA_BUCKETS, mediaUrl } from '@/lib/storage/media';

type Row = RankedRow & {
  profile: { name: string; avatar_path: string | null; bad_loser: boolean } | null;
};

// Visual order 2º · 1º · 3º, each step with its own height.
const steps = [
  { index: 1, height: 'h-20', tone: 'bg-card-elevated' },
  { index: 0, height: 'h-28', tone: 'bg-primary shadow-[0_0_40px_rgba(255,0,0,.35)]' },
  { index: 2, height: 'h-14', tone: 'bg-card-elevated' },
] as const;

export function Podium({ ranking, userId }: { ranking: Row[]; userId: string }) {
  // Only players who actually played earn a podium spot.
  const top = ranking.filter((row) => row.matches > 0).slice(0, 3);

  return (
    <section aria-labelledby="podium" className="border-border bg-card rounded-3xl border p-5">
      <div className="flex items-center justify-between">
        <h2 id="podium" className="text-muted-foreground text-xs font-black tracking-[0.28em]">
          PÓDIO
        </h2>
        <Link href="/ranking" className="text-muted-foreground text-xs font-bold hover:text-white">
          Ranking completo
        </Link>
      </div>

      {top.length ? (
        <ol className="mt-6 grid grid-cols-3 items-end gap-2">
          {steps.map(({ index, height, tone }) => {
            const row = top[index];
            return (
              <li key={index} className="min-w-0 text-center">
                {row ? (
                  <Link href={`/players/${row.playerId}`} className="group block">
                    <PlayerAvatar
                      playerId={row.playerId}
                      name={row.profile?.name ?? 'Jogador'}
                      src={mediaUrl(MEDIA_BUCKETS.profile, row.profile?.avatar_path)}
                      size={index === 0 ? 'xl' : 'md'}
                      className="mb-2"
                    />
                    <div className="truncate text-sm font-bold group-hover:underline">
                      {row.playerId === userId ? 'Você' : (row.profile?.name ?? 'Jogador')}
                    </div>
                    <div className="text-muted-foreground font-mono text-xs">{row.points} pts</div>
                    {row.profile?.bad_loser ? (
                      <div className="mt-1">
                        <BadLoserTag compact />
                      </div>
                    ) : null}
                  </Link>
                ) : (
                  <div className="text-muted-foreground text-sm">—</div>
                )}
                <div
                  className={`mt-2 grid place-items-center rounded-t-xl font-mono text-2xl font-black ${height} ${tone}`}
                >
                  {index + 1}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-muted-foreground mt-4 text-sm">
          O pódio aparece com as primeiras partidas confirmadas.
        </p>
      )}
    </section>
  );
}
