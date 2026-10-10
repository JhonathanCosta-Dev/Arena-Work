export type TierKey =
  | 'madeira'
  | 'bronze'
  | 'ferro'
  | 'prata'
  | 'ouro'
  | 'platina'
  | 'diamante'
  | 'ancestral'
  | 'divino'
  | 'imortal';

type TierDefinition = {
  key: TierKey;
  name: string;
  color: string;
  /** Points needed to climb one division inside this tier (3 divisions per tier). */
  divisionSize: number;
};

// Calibrated for ~30 matches/month: a strong player reaches Ouro in ~2 months and Imortal in
// ~8; an average one takes ~1.5 year to Imortal. Competitive points never reset.
export const TIERS: readonly TierDefinition[] = [
  { key: 'madeira', name: 'Madeira', color: '#a0703c', divisionSize: 50 },
  { key: 'bronze', name: 'Bronze', color: '#cd7f32', divisionSize: 75 },
  { key: 'ferro', name: 'Ferro', color: '#8b939e', divisionSize: 100 },
  { key: 'prata', name: 'Prata', color: '#d4dbe5', divisionSize: 125 },
  { key: 'ouro', name: 'Ouro', color: '#f5c542', divisionSize: 150 },
  { key: 'platina', name: 'Platina', color: '#3fd0c0', divisionSize: 200 },
  { key: 'diamante', name: 'Diamante', color: '#6cb6ff', divisionSize: 250 },
  { key: 'ancestral', name: 'Ancestral', color: '#b06cff', divisionSize: 300 },
  { key: 'divino', name: 'Divino', color: '#ff7ad9', divisionSize: 400 },
  { key: 'imortal', name: 'Imortal', color: '#ff3b3b', divisionSize: 500 },
];

export type TierInfo = {
  key: TierKey;
  name: string;
  color: string;
  /** 1 (lowest) to 3 (highest) inside the tier. */
  division: 1 | 2 | 3;
  label: string;
  /** 0 = Madeira 1 … 29 = Imortal 3. */
  rank: number;
  minPoints: number;
  /** Points where the next division starts; null at Imortal 3. */
  nextAt: number | null;
  nextLabel: string | null;
  /** 0..1 progress inside the current division (1 at the top division). */
  progress: number;
};

type Division = { tier: TierDefinition; division: 1 | 2 | 3; minPoints: number };

const DIVISIONS: Division[] = (() => {
  const list: Division[] = [];
  let min = 0;
  for (const tier of TIERS) {
    for (const division of [1, 2, 3] as const) {
      list.push({ tier, division, minPoints: min });
      min += tier.divisionSize;
    }
  }
  return list;
})();

export function tierFromPoints(points: number): TierInfo {
  const safe = Math.max(0, points);
  let rank = 0;
  for (let i = 0; i < DIVISIONS.length; i += 1) {
    if (safe >= DIVISIONS[i]!.minPoints) rank = i;
  }
  const current = DIVISIONS[rank]!;
  const next = DIVISIONS[rank + 1] ?? null;
  const span = next ? next.minPoints - current.minPoints : 1;

  return {
    key: current.tier.key,
    name: current.tier.name,
    color: current.tier.color,
    division: current.division,
    label: `${current.tier.name} ${current.division}`,
    rank,
    minPoints: current.minPoints,
    nextAt: next?.minPoints ?? null,
    nextLabel: next ? `${next.tier.name} ${next.division}` : null,
    progress: next ? Math.min(1, (safe - current.minPoints) / span) : 1,
  };
}

/** Tier index (0 = Madeira … 9 = Imortal), ignoring the division. */
export function tierGroupIndex(key: TierKey) {
  return TIERS.findIndex((tier) => tier.key === key);
}

export function tierColor(key: TierKey) {
  return TIERS.find((tier) => tier.key === key)?.color ?? TIERS[0]!.color;
}
