import {
  Award,
  Crown,
  Flame,
  Footprints,
  Lock,
  Medal,
  Shield,
  Swords,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { ACHIEVEMENTS, type AchievementKey } from '../domain/achievements';
import type { PlayerCompetitive } from '../server/get-competitive';
import { TierEmblem } from './tier-emblem';

const achievementIcons: Record<AchievementKey, LucideIcon> = {
  first_win: Footprints,
  streak_5: Flame,
  streak_8: Zap,
  streak_12: Crown,
  wins_25: Medal,
  wins_100: Shield,
  flawless_10: Award,
  giant_slayer: Swords,
  champion: Trophy,
};

const rarityStyle = {
  common: 'text-muted-foreground border-border',
  rare: 'text-sky-300 border-sky-400/40 bg-sky-400/5',
  epic: 'text-fuchsia-300 border-fuchsia-400/40 bg-fuchsia-400/5',
  legendary:
    'text-amber-300 border-amber-400/50 bg-amber-400/10 shadow-[0_0_18px_rgba(251,191,36,.15)]',
} as const;

export function CompetitiveCard({ data }: { data: PlayerCompetitive }) {
  const { tier, row } = data;
  const points = row?.points ?? 0;
  const toNext = tier.nextAt !== null ? tier.nextAt - points : 0;

  return (
    <section
      aria-labelledby="competitive-title"
      className="border-border bg-card rounded-3xl border p-5"
    >
      <h2
        id="competitive-title"
        className="text-muted-foreground text-xs font-black tracking-[0.28em]"
      >
        COMPETITIVO
      </h2>

      <div className="mt-4 flex items-center gap-4">
        <TierEmblem tier={tier.key} division={tier.division} size="lg" label={tier.label} />
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-black" style={{ color: tier.color }}>
            {tier.label}
          </div>
          <div className="font-mono text-sm">
            {points.toLocaleString('pt-BR')} <span className="text-muted-foreground">pts</span>
            {row ? (
              <span className="text-muted-foreground"> · {row.position}º no elo geral</span>
            ) : null}
          </div>
          <div
            role="progressbar"
            aria-label="Progresso até a próxima divisão"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(tier.progress * 100)}
            className="bg-background mt-2 h-2 overflow-hidden rounded-full"
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(3, tier.progress * 100)}%`, background: tier.color }}
            />
          </div>
          <div className="text-muted-foreground mt-1 text-xs">
            {tier.nextLabel
              ? `Faltam ${toNext} pts para ${tier.nextLabel}`
              : 'Topo do competitivo!'}
          </div>
        </div>
      </div>

      {row ? (
        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="bg-background rounded-xl p-2">
            <dt className="text-muted-foreground text-[10px] font-bold">SEQUÊNCIA</dt>
            <dd className="font-mono text-lg font-black">
              {row.currentStreak >= 2 ? '🔥' : ''}
              {row.currentStreak}
            </dd>
          </div>
          <div className="bg-background rounded-xl p-2">
            <dt className="text-muted-foreground text-[10px] font-bold">MELHOR SEQ.</dt>
            <dd className="font-mono text-lg font-black">{row.bestStreak}</dd>
          </div>
          <div className="bg-background rounded-xl p-2">
            <dt className="text-muted-foreground text-[10px] font-bold">V–D GERAL</dt>
            <dd className="font-mono text-lg font-black">
              {row.wins}–{row.losses}
            </dd>
          </div>
        </dl>
      ) : null}

      {data.medals.length ? (
        <div className="mt-6">
          <h3 className="text-sm font-black">Medalhas do mês</h3>
          <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {data.medals.map((medal) => (
              <li
                key={medal.seasonId}
                className="border-border bg-background flex w-24 shrink-0 flex-col items-center gap-1 rounded-2xl border p-3 text-center"
              >
                <TierEmblem tier={medal.tier.key} division={medal.tier.division} size="md" />
                <span className="text-[11px] font-black" style={{ color: medal.tier.color }}>
                  {medal.tier.label}
                </span>
                <span className="text-muted-foreground line-clamp-2 text-[10px]">
                  {medal.seasonName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="text-sm font-black">
          Conquistas{' '}
          <span className="text-muted-foreground font-mono text-xs">
            {data.earned.size}/{ACHIEVEMENTS.length}
          </span>
        </h3>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACHIEVEMENTS.map((achievement) => {
            const earned = data.earned.has(achievement.key);
            const Icon = earned ? achievementIcons[achievement.key] : Lock;
            return (
              <li
                key={achievement.key}
                className={`flex items-start gap-2 rounded-xl border p-3 ${
                  earned
                    ? rarityStyle[achievement.rarity]
                    : 'border-border text-muted-foreground opacity-45'
                }`}
              >
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-xs font-black">
                    {achievement.name}
                    {achievement.key === 'champion' && data.championships > 1
                      ? ` ×${data.championships}`
                      : ''}
                  </span>
                  <span className="block text-[10px] leading-4 opacity-80">
                    {achievement.description}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
