import { getCurrentRanking } from '@/features/ranking/server/get-current-ranking';
import { requireUser } from '@/lib/auth/require-user';

export default async function RankingPage() {
  const { supabase } = await requireUser();
  const { season, ranking } = await getCurrentRanking(supabase);

  return (
    <section>
      <p className="text-primary text-xs font-black tracking-[0.28em]">RANKING</p>
      <h1 className="mt-2 text-3xl font-black">{season?.name ?? 'Temporada atual'}</h1>
      <div className="mt-6 space-y-2">
        {ranking.map((row) => (
          <article
            key={row.playerId}
            className="border-border bg-card grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-2xl border p-4"
          >
            <span className="text-muted-foreground font-mono text-lg font-black">
              #{row.position}
            </span>
            <div>
              <div className="font-bold">{row.profile?.name ?? 'Jogador'}</div>
              <div className="text-muted-foreground mt-1 text-xs">
                {row.wins}V · {row.losses}D · {(row.winRate * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-right font-mono text-xl font-black">
              {row.points}
              <div className="text-muted-foreground text-[10px]">PTS</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
