import { finishSeasonAction, startSeasonAction } from '@/features/admin/actions/seasons';
import { clearBadLoserAction, setMemberActiveAction } from '@/features/admin/actions/members';
import { BadLoserTag } from '@/components/ui/bad-loser-tag';
import { resolveDisputeAction } from '@/features/admin/actions/disputes';
import { ActionButton } from '@/features/admin/components/action-button';
import { SeasonForm } from '@/features/admin/components/season-form';
import { CompanyForm } from '@/features/company/components/company-form';
import { getCompany } from '@/features/company/server/get-company';
import { MatchCard } from '@/features/matches/components/match-card';
import { getSeasonMatches } from '@/features/matches/server/get-season-matches';
import { requireAdmin } from '@/lib/auth/require-admin';
import { formatDate, formatSeasonEnd, seasonEndInput, seasonStartInput } from '@/lib/dates';

const seasonStatus = {
  scheduled: { text: 'Agendada', className: 'bg-warning/15 text-warning' },
  active: { text: 'Ativa', className: 'bg-success/15 text-success' },
  finished: { text: 'Encerrada', className: 'bg-card-elevated text-muted-foreground' },
} as const;

export default async function AdminPage() {
  const { userId, supabase } = await requireAdmin();

  const [{ data: seasons }, { data: profiles }, company] = await Promise.all([
    supabase
      .from('seasons')
      .select('id, name, starts_at, ends_at, status')
      .order('starts_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, name, email, role, is_active, created_at, bad_loser')
      .order('name'),
    getCompany(supabase),
  ]);

  const activeSeason = seasons?.find((season) => season.status === 'active');
  const disputed = activeSeason
    ? await getSeasonMatches(supabase, activeSeason.id, { statuses: ['disputed'] })
    : [];
  const { data: disputeRows } = disputed.length
    ? await supabase
        .from('match_disputes')
        .select('match_id, reason')
        .in(
          'match_id',
          disputed.map((match) => match.id),
        )
    : { data: [] };
  const reasons = new Map((disputeRows ?? []).map((row) => [row.match_id, row.reason]));

  const pendingMembers = (profiles ?? []).filter((profile) => !profile.is_active);
  const activeMembers = (profiles ?? []).filter((profile) => profile.is_active);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-primary text-xs font-black tracking-[0.28em]">ADMIN</p>
        <h1 className="mt-2 text-3xl font-black">Controle da Arena</h1>
      </div>

      <section aria-labelledby="company-title" className="space-y-4">
        <h2 id="company-title" className="text-xl font-black">
          Empresa
        </h2>
        <div className="border-border bg-card rounded-2xl border p-5">
          <CompanyForm company={company} />
        </div>
      </section>

      <section aria-labelledby="seasons-title" className="space-y-4">
        <h2 id="seasons-title" className="text-xl font-black">
          Temporadas
        </h2>

        <div className="border-border bg-card rounded-2xl border p-5">
          <h3 className="mb-4 font-bold">Nova temporada</h3>
          <SeasonForm />
        </div>

        <ul className="space-y-3">
          {(seasons ?? []).map((season) => {
            const status = seasonStatus[season.status];
            return (
              <li key={season.id} className="border-border bg-card rounded-2xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{season.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${status.className}`}
                      >
                        {status.text}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {formatDate(season.starts_at)} → {formatSeasonEnd(season.ends_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {season.status === 'scheduled' ? (
                      <ActionButton
                        action={startSeasonAction}
                        fields={{ seasonId: season.id }}
                        label="Ativar"
                        variant="success"
                      />
                    ) : null}
                    {season.status === 'active' ? (
                      <ActionButton
                        action={finishSeasonAction}
                        fields={{ seasonId: season.id }}
                        label="Encerrar"
                        confirmLabel="Confirmar encerramento"
                        variant="danger"
                      />
                    ) : null}
                  </div>
                </div>
                {season.status !== 'finished' ? (
                  <details className="border-border mt-3 border-t pt-3">
                    <summary className="text-muted-foreground cursor-pointer text-sm font-bold hover:text-white">
                      Editar nome e datas
                    </summary>
                    <div className="mt-4">
                      <SeasonForm
                        season={{
                          id: season.id,
                          name: season.name,
                          startDate: seasonStartInput(season.starts_at),
                          endDate: seasonEndInput(season.ends_at),
                        }}
                      />
                    </div>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="text-muted-foreground text-xs">
          Partidas só podem ser registradas na temporada ativa e dentro das datas dela.
        </p>
      </section>

      <section aria-labelledby="members-title" className="space-y-4">
        <h2 id="members-title" className="text-xl font-black">
          Jogadores
        </h2>

        <div>
          <h3 className="font-bold">
            Aguardando aprovação
            {pendingMembers.length ? (
              <span className="bg-primary ml-2 rounded-full px-2 py-0.5 text-xs">
                {pendingMembers.length}
              </span>
            ) : null}
          </h3>
          <ul className="mt-3 space-y-2">
            {pendingMembers.length ? (
              pendingMembers.map((member) => (
                <li
                  key={member.id}
                  className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
                >
                  <div className="min-w-0">
                    <div className="truncate font-bold">{member.name}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {member.email} · cadastro em {formatDate(member.created_at)}
                    </div>
                  </div>
                  <ActionButton
                    action={setMemberActiveAction}
                    fields={{ profileId: member.id, active: 'true' }}
                    label="Aprovar"
                    variant="success"
                  />
                </li>
              ))
            ) : (
              <li className="text-muted-foreground text-sm">Ninguém aguardando.</li>
            )}
          </ul>
        </div>

        <details>
          <summary className="cursor-pointer font-bold">Ativos ({activeMembers.length})</summary>
          <ul className="mt-3 space-y-2">
            {activeMembers.map((member) => (
              <li
                key={member.id}
                className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
              >
                <div className="min-w-0">
                  <div className="truncate font-bold">
                    {member.name}
                    {member.role === 'admin' ? (
                      <span className="text-primary ml-2 text-[11px] font-bold">ADMIN</span>
                    ) : null}
                    {member.bad_loser ? (
                      <span className="ml-2 align-middle">
                        <BadLoserTag />
                      </span>
                    ) : null}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">{member.email}</div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {member.bad_loser ? (
                    <ActionButton
                      action={clearBadLoserAction}
                      fields={{ profileId: member.id }}
                      label="Remover tag"
                      variant="success"
                    />
                  ) : null}
                  {member.id !== userId ? (
                    <ActionButton
                      action={setMemberActiveAction}
                      fields={{ profileId: member.id, active: 'false' }}
                      label="Desativar"
                      confirmLabel="Confirmar"
                      variant="danger"
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section aria-labelledby="disputes-title" className="space-y-4">
        <h2 id="disputes-title" className="text-xl font-black">
          Disputas
        </h2>
        {disputed.length ? (
          <div className="space-y-3">
            {disputed.map((match) => (
              <MatchCard key={match.id} match={match}>
                {reasons.get(match.id) ? (
                  <p className="bg-background text-muted-foreground mt-3 rounded-xl p-3 text-sm">
                    “{reasons.get(match.id)}”
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <ActionButton
                    action={resolveDisputeAction}
                    fields={{ matchId: match.id, resolution: 'cancel' }}
                    label="Cancelar partida"
                    variant="danger"
                  />
                  <ActionButton
                    action={resolveDisputeAction}
                    fields={{ matchId: match.id, resolution: 'confirm' }}
                    label="Manter resultado"
                    variant="success"
                  />
                </div>
              </MatchCard>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhuma disputa aberta.</p>
        )}
      </section>
    </div>
  );
}
