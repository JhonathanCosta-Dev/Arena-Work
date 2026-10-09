import Link from 'next/link';
import { MatchCard } from '@/features/matches/components/match-card';
import { PendingMatchActions } from '@/features/matches/components/pending-match-actions';
import { getActiveSeason, getSeasonMatches } from '@/features/matches/server/get-season-matches';
import { requireUser } from '@/lib/auth/require-user';

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const [{ userId, supabase }, { registered }] = await Promise.all([requireUser(), searchParams]);
  const season = await getActiveSeason(supabase);
  const matches = season
    ? await getSeasonMatches(supabase, season.id, {
        statuses: ['pending_confirmation', 'disputed', 'confirmed'],
      })
    : [];

  const isMine = (match: (typeof matches)[number]) =>
    match.players.some((player) => player.profileId === userId);
  const toConfirm = matches.filter(
    (match) =>
      match.status === 'pending_confirmation' && match.createdBy !== userId && isMine(match),
  );
  const awaiting = matches.filter(
    (match) =>
      (match.status === 'pending_confirmation' && match.createdBy === userId) ||
      (match.status === 'disputed' && isMine(match)),
  );
  const confirmed = matches.filter((match) => match.status === 'confirmed');

  return (
    <div className="space-y-8">
      <div>
        <p className="text-primary text-xs font-black tracking-[0.28em]">PARTIDAS</p>
        <h1 className="mt-2 text-3xl font-black">{season?.name ?? 'Sem temporada ativa'}</h1>
      </div>

      {registered ? (
        <p
          role="status"
          className="border-success/40 bg-success/10 text-success rounded-2xl border p-4 text-sm"
        >
          Partida registrada! Ela entra no ranking assim que o seu adversário confirmar.
        </p>
      ) : null}

      <section aria-labelledby="to-confirm">
        <h2 id="to-confirm" className="text-lg font-black">
          Aguardando sua confirmação
          {toConfirm.length ? (
            <span className="bg-primary ml-2 rounded-full px-2 py-0.5 text-xs">
              {toConfirm.length}
            </span>
          ) : null}
        </h2>
        <div className="mt-3 space-y-3">
          {toConfirm.length ? (
            toConfirm.map((match) => (
              <MatchCard key={match.id} match={match} currentUserId={userId}>
                <PendingMatchActions matchId={match.id} />
              </MatchCard>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">Nenhuma partida para confirmar.</p>
          )}
        </div>
      </section>

      {awaiting.length ? (
        <section aria-labelledby="awaiting">
          <h2 id="awaiting" className="text-lg font-black">
            Enviadas por você / em disputa
          </h2>
          <div className="mt-3 space-y-3">
            {awaiting.map((match) => (
              <MatchCard key={match.id} match={match} currentUserId={userId} />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="confirmed">
        <h2 id="confirmed" className="text-lg font-black">
          Últimas confirmadas
        </h2>
        <div className="mt-3 space-y-3">
          {confirmed.length ? (
            confirmed.map((match) => (
              <MatchCard key={match.id} match={match} currentUserId={userId} />
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              Ainda não há partidas confirmadas.{' '}
              <Link href="/matches/new" className="text-primary font-bold">
                Registrar a primeira
              </Link>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
