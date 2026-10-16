import Link from 'next/link';

const tabs = [
  { key: 'month', href: '/ranking', label: 'Mês' },
  { key: 'elo', href: '/ranking?tab=elo', label: 'Elo geral' },
  { key: 'ladder', href: '/ranking/elos', label: 'Escada' },
] as const;

export type RankingTab = (typeof tabs)[number]['key'];

export function RankingTabs({ active }: { active: RankingTab }) {
  return (
    <nav aria-label="Tipo de ranking" className="bg-card grid grid-cols-3 gap-1 rounded-xl p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? 'page' : undefined}
          className={`rounded-lg px-4 py-2 text-center text-sm font-bold ${tab.key === active ? 'bg-card-elevated text-white' : 'text-muted-foreground hover:text-white'}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
