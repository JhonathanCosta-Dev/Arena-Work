import type { Metadata } from 'next';
import { Mountain } from 'lucide-react';
import { TierEmblem } from '@/features/competitive/components/tier-emblem';
import { HowToClimb, TierLadder } from '@/features/competitive/components/tier-ladder';
import { LOSS_POINTS, winsNeeded, type WinsNeeded } from '@/features/competitive/domain/rating';
import { tierFromPoints, TOP_POINTS } from '@/features/competitive/domain/tiers';
import { getCompetitive } from '@/features/competitive/server/get-competitive';
import { RankingTabs } from '@/features/ranking/components/ranking-tabs';
import { requireUser } from '@/lib/auth/require-user';

export const metadata: Metadata = { title: 'Escada de elos' };

function winsText({ inARow, withoutStreak }: WinsNeeded) {
  if (inARow === withoutStreak) {
    return inARow === 1 ? '1 vitória' : `${inARow} vitórias`;
  }
  return `${inARow} vitórias seguidas ou até ${withoutStreak} sem sequência`;
}

function Goal({
  label,
  target,
  missing,
  wins,
}: {
  label: string;
  target: string;
  missing: number;
  wins: WinsNeeded;
}) {
  return (
    <div className="bg-background rounded-2xl p-4">
      <div className="text-muted-foreground text-[10px] font-black tracking-[0.2em]">{label}</div>
      <div className="mt-1 font-black">{target}</div>
      <div className="mt-2 font-mono text-2xl font-black">
        {missing}
        <span className="text-muted-foreground ml-1 text-xs">pts</span>
      </div>
      <p className="text-muted-foreground mt-1 text-xs">{winsText(wins)}</p>
    </div>
  );
}

export default async function TierLadderPage() {
  const { userId, supabase } = await requireUser();
  const competitive = await getCompetitive(supabase);

  const me = competitive.rows.find((row) => row.playerId === userId) ?? null;
  const points = me?.points ?? 0;
  const streak = me?.currentStreak ?? 0;
  const tier = me?.tier ?? tierFromPoints(points);
  const atTop = tier.nextAt === null;
  const top = tierFromPoints(TOP_POINTS);

  const players = competitive.rows.map((row) => {
    const profile = competitive.profileById.get(row.playerId);
    return {
      playerId: row.playerId,
      name: profile?.name ?? 'Jogador',
      avatarPath: profile?.avatar_path ?? null,
      points: row.points,
      tier: row.tier,
    };
  });

  return (
    <div className="space-y-6">
      <section>
        <p className="text-primary text-xs font-black tracking-[0.28em]">RANKING</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">Escada de elos</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Do Madeira 1 ao Imortal 3: veja onde você está e até onde dá para chegar.
            </p>
          </div>
          <RankingTabs active="ladder" />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-[3fr_2fr] md:gap-6">
        <section
          aria-labelledby="my-climb"
          className="border-border bg-card rounded-3xl border p-5 sm:p-6"
        >
          <h2 id="my-climb" className="sr-only">
            Sua escalada
          </h2>
          <div className="flex items-center gap-4">
            <TierEmblem tier={tier.key} division={tier.division} size="lg" label={tier.label} />
            <div className="min-w-0">
              <div className="text-muted-foreground text-[10px] font-black tracking-[0.2em]">
                VOCÊ ESTÁ EM
              </div>
              <div className="text-2xl font-black" style={{ color: tier.color }}>
                {tier.label}
              </div>
              <div className="text-muted-foreground text-sm">
                <span className="font-mono font-black text-white">{points}</span> pts
                {me ? ` · ${me.position}º no elo geral` : ''}
                {streak >= 2 ? ` · 🔥 ${streak} seguidas` : ''}
              </div>
            </div>
          </div>

          {atTop ? (
            <p className="border-warning/40 bg-warning/10 text-warning mt-5 flex items-center gap-2 rounded-2xl border p-4 text-sm font-bold">
              <Mountain className="size-5 shrink-0" aria-hidden="true" />
              Você chegou ao topo da Arena. Agora é defender o posto.
            </p>
          ) : (
            <>
              <div
                role="progressbar"
                aria-label={`Progresso até ${tier.nextLabel}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(tier.progress * 100)}
                className="bg-background mt-5 h-2 overflow-hidden rounded-full"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(3, tier.progress * 100)}%`,
                    background: tier.color,
                  }}
                />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Goal
                  label="PRÓXIMA DIVISÃO"
                  target={tier.nextLabel ?? ''}
                  missing={(tier.nextAt ?? points) - points}
                  wins={winsNeeded(points, tier.nextAt ?? points, streak)}
                />
                <Goal
                  label="O TOPO"
                  target={`${top.label} · ${TOP_POINTS} pts`}
                  missing={TOP_POINTS - points}
                  wins={winsNeeded(points, TOP_POINTS, streak)}
                />
              </div>
              <p className="text-muted-foreground mt-3 text-xs">
                Estimativa sem contar derrotas: cada derrota tira {LOSS_POINTS} pts e zera a
                sequência.
              </p>
            </>
          )}
        </section>

        <HowToClimb />
      </div>

      <TierLadder players={players} currentUserId={userId} currentPoints={points} />
    </div>
  );
}
