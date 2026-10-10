import Link from 'next/link';
import { BellRing, ChevronRight, Flame, Swords, Trophy, UsersRound } from 'lucide-react';
import { MyStanding } from '@/features/dashboard/components/my-standing';
import { Podium } from '@/features/dashboard/components/podium';
import { SeasonHero } from '@/features/dashboard/components/season-hero';
import { getCompany } from '@/features/company/server/get-company';
import { bestStreakHolder, seasonProgress } from '@/features/dashboard/domain/insights';
import { MatchCard } from '@/features/matches/components/match-card';
import {
  countPendingConfirmations,
  getSeasonMatches,
} from '@/features/matches/server/get-season-matches';
import { getCurrentRanking } from '@/features/ranking/server/get-current-ranking';
import { ChampionSpotlight } from '@/features/competitive/components/champion-spotlight';
import { getCompetitive } from '@/features/competitive/server/get-competitive';
import { requireUser } from '@/lib/auth/require-user';
import { formatDate } from '@/lib/dates';

export default async function DashboardPage() {
  const { userId, profile, supabase } = await requireUser();
  const [{ season, ranking }, pendingCount, company, competitive] = await Promise.all([
    getCurrentRanking(supabase),
    countPendingConfirmations(supabase, userId),
    getCompany(supabase),
    getCompetitive(supabase),
  ]);
  const recent = season
    ? await getSeasonMatches(supabase, season.id, { statuses: ['confirmed'], limit: 5 })
    : [];

  const confirmedTotal = ranking.reduce((sum, row) => sum + row.matches, 0) / 2;
  const streak = bestStreakHolder(ranking);
  const me = competitive.player(userId);
  const playing = ranking.filter((row) => row.matches > 0).length;
  const registerWindow = season
    ? seasonProgress(season.starts_at, season.ends_at)
    : { hasStarted: false, hasEnded: false };

  return (
    <div className="space-y-4 md:space-y-6">
      <SeasonHero
        company={company}
        playerName={profile.name}
        isAdmin={profile.role === 'admin'}
        season={season}
      />

      {competitive.champion ? (
        <ChampionSpotlight champion={competitive.champion} userId={userId} />
      ) : null}

      {pendingCount ? (
        <Link
          href="/matches"
          className="border-warning/40 bg-warning/10 flex items-center gap-3 rounded-2xl border p-4 transition hover:brightness-125"
        >
          <BellRing className="text-warning size-5 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-sm">
            <strong className="text-warning">
              {pendingCount === 1
                ? '1 partida aguarda sua confirmação'
                : `${pendingCount} partidas aguardam sua confirmação`}
            </strong>
            <span className="text-muted-foreground block text-xs">
              Confirme para o resultado entrar no ranking.
            </span>
          </span>
          <ChevronRight className="text-warning size-5" aria-hidden="true" />
        </Link>
      ) : null}

      {season ? (
        registerWindow.hasStarted && !registerWindow.hasEnded ? (
          <Link
            href="/matches/new"
            className="bg-primary flex min-h-16 items-center justify-center gap-3 rounded-2xl px-6 text-base font-black text-white shadow-[0_14px_40px_rgba(255,0,0,.18)] transition hover:brightness-110"
          >
            <Swords className="size-5" aria-hidden="true" /> Registrar partida
          </Link>
        ) : (
          <div className="border-border bg-card text-muted-foreground flex min-h-16 items-center justify-center gap-3 rounded-2xl border px-6 text-center text-sm font-bold">
            <Swords className="size-5 shrink-0" aria-hidden="true" />
            {registerWindow.hasStarted
              ? 'Prazo da temporada encerrado. Aguarde a próxima.'
              : `Partidas liberadas a partir de ${formatDate(season.starts_at)}`}
          </div>
        )
      ) : null}

      {season ? (
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <MyStanding
            ranking={ranking}
            userId={userId}
            tier={me.tier}
            competitivePoints={me.row?.points ?? 0}
          />
          <Podium ranking={ranking} userId={userId} />
        </div>
      ) : null}

      {season ? (
        <section aria-label="Números da temporada" className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="border-border bg-card rounded-2xl border p-4">
            <Trophy className="text-muted-foreground size-4" aria-hidden="true" />
            <div className="mt-3 font-mono text-2xl font-black">{confirmedTotal}</div>
            <div className="text-muted-foreground text-xs">partidas confirmadas</div>
          </div>
          <div className="border-border bg-card rounded-2xl border p-4">
            <UsersRound className="text-muted-foreground size-4" aria-hidden="true" />
            <div className="mt-3 font-mono text-2xl font-black">
              {playing}
              <span className="text-muted-foreground text-sm">/{ranking.length}</span>
            </div>
            <div className="text-muted-foreground text-xs">jogadores em ação</div>
          </div>
          <div className="border-border bg-card rounded-2xl border p-4">
            <Flame className="text-warning size-4" aria-hidden="true" />
            <div className="mt-3 font-mono text-2xl font-black">{streak?.bestStreak ?? 0}</div>
            <div className="text-muted-foreground text-xs">maior sequência</div>
            {streak ? (
              <div className="truncate text-xs font-bold">{streak.profile?.name ?? 'Jogador'}</div>
            ) : null}
          </div>
        </section>
      ) : null}

      {season ? (
        <section aria-labelledby="recent-matches">
          <div className="flex items-center justify-between">
            <h2 id="recent-matches" className="text-lg font-black">
              Últimos jogos
            </h2>
            <Link
              href="/matches"
              className="text-muted-foreground text-xs font-bold hover:text-white"
            >
              Ver todos
            </Link>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {recent.length ? (
              recent.map((match) => (
                <MatchCard key={match.id} match={match} currentUserId={userId} />
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhuma partida confirmada ainda. Bora abrir o placar?
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
