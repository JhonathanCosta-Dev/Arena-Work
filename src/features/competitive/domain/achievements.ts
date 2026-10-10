import type { CompetitiveStats } from './rating';

export type AchievementKey =
  | 'first_win'
  | 'streak_5'
  | 'streak_8'
  | 'streak_12'
  | 'wins_25'
  | 'wins_100'
  | 'flawless_10'
  | 'giant_slayer'
  | 'champion';

export type Achievement = {
  key: AchievementKey;
  name: string;
  description: string;
  /** Visual weight for badges: common < rare < epic < legendary. */
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
};

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    key: 'first_win',
    name: 'Primeiro Sangue',
    description: 'Venceu a primeira partida.',
    rarity: 'common',
  },
  { key: 'streak_5', name: 'Embalado', description: '5 vitórias seguidas.', rarity: 'rare' },
  { key: 'streak_8', name: 'Imparável', description: '8 vitórias seguidas.', rarity: 'epic' },
  {
    key: 'streak_12',
    name: 'Lenda Viva',
    description: '12 vitórias seguidas.',
    rarity: 'legendary',
  },
  { key: 'wins_25', name: 'Veterano', description: '25 vitórias no total.', rarity: 'rare' },
  {
    key: 'wins_100',
    name: 'Centurião',
    description: '100 vitórias no total.',
    rarity: 'legendary',
  },
  {
    key: 'flawless_10',
    name: 'Pneu',
    description: '10 vitórias sem ceder um set.',
    rarity: 'epic',
  },
  {
    key: 'giant_slayer',
    name: 'Mata-Gigante',
    description: 'Venceu alguém de elo superior.',
    rarity: 'rare',
  },
  {
    key: 'champion',
    name: 'Campeão do Mês',
    description: 'Terminou um mês em 1º lugar.',
    rarity: 'legendary',
  },
];

export function earnedAchievements(
  stats: CompetitiveStats | undefined,
  championships: number,
): Set<AchievementKey> {
  const earned = new Set<AchievementKey>();
  if (championships > 0) earned.add('champion');
  if (!stats) return earned;
  if (stats.wins >= 1) earned.add('first_win');
  if (stats.bestStreak >= 5) earned.add('streak_5');
  if (stats.bestStreak >= 8) earned.add('streak_8');
  if (stats.bestStreak >= 12) earned.add('streak_12');
  if (stats.wins >= 25) earned.add('wins_25');
  if (stats.wins >= 100) earned.add('wins_100');
  if (stats.flawlessWins >= 10) earned.add('flawless_10');
  if (stats.giantSlayerWins >= 1) earned.add('giant_slayer');
  return earned;
}

const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 } as const;

/** Most prestigious earned achievement, shown next to the name in compact lists. */
export function topAchievement(earned: Set<AchievementKey>): Achievement | null {
  return (
    ACHIEVEMENTS.filter((a) => earned.has(a.key)).sort(
      (a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity],
    )[0] ?? null
  );
}
