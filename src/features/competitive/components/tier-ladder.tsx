import { Check, Lock } from 'lucide-react';
import { MEDIA_BUCKETS, mediaUrl } from '@/lib/storage/media';
import { LOSS_POINTS, STREAK_BONUS_CAP, WIN_POINTS, winValue } from '../domain/rating';
import { divisionLadder, TIERS, type TierInfo } from '../domain/tiers';
import { PlayerAvatar } from './player-badges';
import { TierEmblem } from './tier-emblem';

export type LadderPlayer = {
  playerId: string;
  name: string;
  avatarPath: string | null;
  points: number;
  tier: TierInfo;
};

const MAX_AVATARS = 5;

export function HowToClimb() {
  const streak = [1, 2, 3, 4, 5, 6].map((n) => ({ n, value: winValue(n) }));

  return (
    <section
      aria-labelledby="how-to-climb"
      className="border-border bg-card rounded-3xl border p-5 sm:p-6"
    >
      <h2 id="how-to-climb" className="text-lg font-black">
        Como subir
      </h2>
      <ul className="text-muted-foreground mt-3 space-y-1.5 text-sm">
        <li>
          <strong className="text-success">+{WIN_POINTS}</strong> por vitória.
        </li>
        <li>
          <strong className="text-warning">+5</strong> de bônus por vitória seguida, até{' '}
          <strong className="text-warning">+{STREAK_BONUS_CAP}</strong>.
        </li>
        <li>
          <strong className="text-danger">−{LOSS_POINTS}</strong> por derrota, sem nunca ficar
          abaixo de 0. A sequência zera.
        </li>
        <li>Os pontos nunca zeram entre temporadas.</li>
      </ul>
      <ol aria-label="Pontos por vitória seguida" className="mt-4 grid grid-cols-6 gap-1 text-center">
        {streak.map(({ n, value }) => (
          <li key={n} className="bg-background rounded-xl px-1 py-2">
            <div className="text-muted-foreground text-[10px] font-bold">
              {n}ª{n === 6 ? '+' : ''}
            </div>
            <div className="font-mono text-sm font-black">{value}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TierLadder({
  players,
  currentUserId,
  currentPoints,
}: {
  players: LadderPlayer[];
  currentUserId: string;
  currentPoints: number;
}) {
  const ladder = divisionLadder();
  const byRank = new Map<number, LadderPlayer[]>();
  for (const player of players) {
    const list = byRank.get(player.tier.rank) ?? [];
    list.push(player);
    byRank.set(player.tier.rank, list);
  }

  // Highest tier first, and inside each tier division 3 → 1.
  const tiers = [...TIERS].reverse().map((tier) => {
    const divisions = ladder.filter((entry) => entry.key === tier.key).reverse();
    const lowest = divisions.at(-1)!;
    const count = divisions.reduce((sum, entry) => sum + (byRank.get(entry.rank)?.length ?? 0), 0);
    return { tier, divisions, minPoints: lowest.minPoints, count };
  });

  return (
    <ol aria-label="Escada de elos" className="grid gap-3 md:grid-cols-2">
      {tiers.map(({ tier, divisions, minPoints, count }) => {
        const reached = currentPoints >= minPoints;
        return (
          <li
            key={tier.key}
            className="bg-card rounded-2xl border p-4"
            style={{ borderColor: reached ? `${tier.color}55` : undefined }}
          >
            <div className="flex items-center gap-3">
              <TierEmblem tier={tier.key} division={3} size="md" />
              <div className="min-w-0 flex-1">
                <h3 className="font-black" style={{ color: tier.color }}>
                  {tier.name}
                </h3>
                <p className="text-muted-foreground text-xs">
                  A partir de {minPoints} pts · divisões de {tier.divisionSize} pts
                </p>
              </div>
              <span className="text-muted-foreground text-xs font-bold">
                {count === 1 ? '1 jogador' : `${count} jogadores`}
              </span>
            </div>

            <ul className="mt-3 space-y-1">
              {divisions.map((division) => {
                const here = byRank.get(division.rank) ?? [];
                const isMine = here.some((player) => player.playerId === currentUserId);
                const unlocked = currentPoints >= division.minPoints;
                return (
                  <li
                    key={division.rank}
                    aria-current={isMine ? 'true' : undefined}
                    className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 ${isMine ? 'bg-primary/10 ring-primary/40 ring-1' : ''}`}
                  >
                    <TierEmblem tier={division.key} division={division.division} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <span className={unlocked ? '' : 'text-muted-foreground'}>
                          {division.label}
                        </span>
                        {isMine ? (
                          <span className="bg-primary rounded-full px-2 py-0.5 text-[10px] font-black text-white">
                            Você
                          </span>
                        ) : unlocked ? (
                          <Check className="text-success size-3.5" aria-label="alcançada" />
                        ) : (
                          <Lock className="text-muted-foreground size-3" aria-label="bloqueada" />
                        )}
                      </div>
                      <div className="text-muted-foreground font-mono text-[11px]">
                        {division.minPoints} pts
                      </div>
                    </div>
                    <div className="flex items-center -space-x-2">
                      {here.slice(0, MAX_AVATARS).map((player) => (
                        <PlayerAvatar
                          key={player.playerId}
                          playerId={player.playerId}
                          name={player.name}
                          src={mediaUrl(MEDIA_BUCKETS.profile, player.avatarPath)}
                          size="sm"
                        />
                      ))}
                      {here.length > MAX_AVATARS ? (
                        <span className="bg-card-elevated grid size-8 place-items-center rounded-full text-[10px] font-black">
                          +{here.length - MAX_AVATARS}
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
