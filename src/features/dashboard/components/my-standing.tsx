import Link from 'next/link';
import { Crown, Flame, Target } from 'lucide-react';
import { TierEmblem } from '@/features/competitive/components/tier-emblem';
import type { TierInfo } from '@/features/competitive/domain/tiers';
import type { RankedRow } from '@/features/ranking/domain/ranking';
import { chaseTarget } from '../domain/insights';

type Row = RankedRow & { profile: { name: string } | null };

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function MyStanding({
  ranking,
  userId,
  tier,
  competitivePoints,
}: {
  ranking: Row[];
  userId: string;
  tier: TierInfo;
  competitivePoints: number;
}) {
  const me = ranking.find((row) => row.playerId === userId);
  if (!me) return null;

  const chase = chaseTarget(ranking, userId);
  const hasPlayed = me.matches > 0;

  let goal: { icon: typeof Crown; text: string };
  if (!hasPlayed) {
    goal = { icon: Target, text: 'Jogue sua primeira partida para entrar na disputa.' };
  } else if (!chase) {
    goal = { icon: Crown, text: 'Você lidera a temporada. Segura essa coroa!' };
  } else {
    const rival = chase.target.profile?.name ?? 'o próximo';
    goal = {
      icon: Target,
      text:
        chase.winsBehind === 0
          ? `Empatado em vitórias com ${rival}. O desempate decide.`
          : `${plural(chase.winsBehind, 'vitória', 'vitórias')} atrás de ${rival} (${chase.target.position}º).`,
    };
  }
  const GoalIcon = goal.icon;

  return (
    <section aria-labelledby="my-standing" className="border-border bg-card rounded-3xl border p-5">
      <div className="flex items-center justify-between">
        <h2 id="my-standing" className="text-muted-foreground text-xs font-black tracking-[0.28em]">
          SEU DESEMPENHO
        </h2>
        <Link
          href={`/players/${userId}`}
          className="text-muted-foreground text-xs font-bold hover:text-white"
        >
          Ver perfil
        </Link>
      </div>

      <div className="mt-4 flex items-end gap-5">
        <div>
          <div className="font-mono text-6xl leading-none font-black">
            {hasPlayed ? (
              <>
                {me.position}
                <span className="text-primary text-3xl">º</span>
              </>
            ) : (
              '–'
            )}
          </div>
          <div className="text-muted-foreground mt-1 text-xs">de {ranking.length} jogadores</div>
        </div>
        <dl className="grid flex-1 grid-cols-3 gap-2 text-center">
          <div className="bg-background rounded-xl p-2">
            <dt className="text-muted-foreground text-[10px] font-bold">PTS</dt>
            <dd className="font-mono text-xl font-black">{me.points}</dd>
          </div>
          <div className="bg-background rounded-xl p-2">
            <dt className="text-muted-foreground text-[10px] font-bold">V–D</dt>
            <dd className="font-mono text-xl font-black">
              {me.wins}–{me.losses}
            </dd>
          </div>
          <div className="bg-background rounded-xl p-2">
            <dt className="text-muted-foreground text-[10px] font-bold">APROV.</dt>
            <dd className="font-mono text-xl font-black">{Math.round(me.winRate * 100)}%</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p className="flex items-start gap-2">
          <GoalIcon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{goal.text}</span>
        </p>
        {me.currentStreak >= 2 ? (
          <p className="flex items-start gap-2">
            <Flame className="text-warning mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>Em chamas: {plural(me.currentStreak, 'vitória', 'vitórias')} seguidas.</span>
          </p>
        ) : null}
      </div>

      <Link
        href={`/players/${userId}`}
        className="bg-background hover:bg-card-elevated mt-4 flex items-center gap-3 rounded-2xl p-3 transition"
      >
        <TierEmblem tier={tier.key} division={tier.division} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black" style={{ color: tier.color }}>
            {tier.label}{' '}
            <span className="text-muted-foreground font-mono text-xs font-bold">
              {competitivePoints} pts
            </span>
          </span>
          <span className="bg-card mt-1 block h-1.5 overflow-hidden rounded-full">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max(3, tier.progress * 100)}%`, background: tier.color }}
            />
          </span>
          <span className="text-muted-foreground mt-1 block text-[11px]">
            {tier.nextLabel && tier.nextAt !== null
              ? `${tier.nextAt - competitivePoints} pts para ${tier.nextLabel}`
              : 'Topo do competitivo'}
          </span>
        </span>
      </Link>
    </section>
  );
}
