'use client';

import { useRef, useState, useTransition } from 'react';
import { CircleCheckBig, Crown, Frown, ShieldAlert, X } from 'lucide-react';
import { PlayerAvatar } from '@/features/competitive/components/player-badges';
import { BadLoserTag } from '@/components/ui/bad-loser-tag';
import { markNotificationRead } from '@/features/notifications/actions/mark-read';
import { formatDateTime } from '@/lib/dates';
import { MEDIA_BUCKETS, mediaUrl } from '@/lib/storage/media';
import { confirmMatch } from '../actions/confirm-match';
import { disputeMatch } from '../actions/dispute-match';
import type { MatchPlayer, MatchSummary } from '../server/get-season-matches';

type Step = 'review' | 'refuse' | 'accepted' | 'refused';

type ConfirmMatchDialogProps = {
  match: MatchSummary;
  currentUserId: string;
  /** Marked as read when the dialog opens. */
  notificationId?: string | undefined;
  triggerClassName: string;
  children: React.ReactNode;
};

function PlayerColumn({
  player,
  isYou,
  won,
}: {
  player: MatchPlayer;
  isYou: boolean;
  won: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div className="relative">
        {won ? (
          <Crown
            className="text-warning absolute -top-4 left-1/2 size-5 -translate-x-1/2 drop-shadow"
            aria-hidden="true"
          />
        ) : null}
        <PlayerAvatar
          playerId={player.profileId}
          name={player.name}
          src={mediaUrl(MEDIA_BUCKETS.profile, player.avatarPath)}
          size="xl"
        />
      </div>
      <div className="w-full truncate text-sm font-bold">{isYou ? 'Você' : player.name}</div>
      {player.badLoser ? <BadLoserTag compact /> : null}
      <div
        className={`font-mono text-5xl leading-none font-black ${won ? 'text-white' : 'text-muted-foreground'}`}
      >
        {player.score}
      </div>
    </div>
  );
}

export function ConfirmMatchDialog({
  match,
  currentUserId,
  notificationId,
  triggerClassName,
  children,
}: ConfirmMatchDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>('review');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [a, b] = match.players;
  const me = a.profileId === currentUserId ? a : b;
  const rival = me === a ? b : a;
  const creator = match.createdBy === a.profileId ? a : b;
  const iWon = me.score > rival.score;
  const isDraw = me.score === rival.score;
  const isPending = match.status === 'pending_confirmation' && match.createdBy !== currentUserId;

  function open() {
    setStep('review');
    setError(null);
    dialogRef.current?.showModal();
    if (notificationId) void markNotificationRead(notificationId);
  }

  function close() {
    dialogRef.current?.close();
  }

  function run(action: () => Promise<{ ok: boolean; message?: string }>, next: Step) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) setStep(next);
      else setError(result.message ?? 'Não foi possível concluir a ação.');
    });
  }

  return (
    <>
      <button type="button" onClick={open} className={triggerClassName}>
        {children}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`confirm-title-${match.id}`}
        onClick={(event) => {
          if (event.target === event.currentTarget && !pending) close();
        }}
        className="border-border bg-card text-foreground animate-sheet-in fixed inset-0 mx-0 mt-auto mb-0 h-fit max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border p-0 backdrop:bg-black/75 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md sm:rounded-3xl"
      >
        <div className="relative p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
          <div
            aria-hidden="true"
            className="bg-primary/25 pointer-events-none absolute -top-20 left-1/2 size-56 -translate-x-1/2 rounded-full blur-3xl"
          />
          <button
            type="button"
            aria-label="Fechar"
            onClick={close}
            disabled={pending}
            className="text-muted-foreground absolute top-4 right-4 rounded-full p-2 hover:text-white"
          >
            <X className="size-5" />
          </button>
          <div
            className="bg-border mx-auto mb-5 h-1 w-10 rounded-full sm:hidden"
            aria-hidden="true"
          />

          {step === 'accepted' || step === 'refused' ? (
            <div className="relative py-6 text-center">
              {step === 'accepted' ? (
                <CircleCheckBig className="text-success mx-auto size-16" aria-hidden="true" />
              ) : (
                <ShieldAlert className="text-warning mx-auto size-16" aria-hidden="true" />
              )}
              <h2 id={`confirm-title-${match.id}`} className="mt-4 text-2xl font-black">
                {step === 'accepted' ? 'Placar confirmado!' : 'Resultado recusado'}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                {step === 'accepted'
                  ? 'A partida entrou no ranking.'
                  : 'Um administrador vai analisar a partida. Você ficou com a tag de mal perdedor.'}
              </p>
              <button
                type="button"
                onClick={close}
                className="bg-primary mt-6 w-full rounded-2xl px-4 py-3.5 font-black text-white"
              >
                Fechar
              </button>
            </div>
          ) : (
            <div className="relative">
              <p className="text-primary text-[10px] font-black tracking-[0.28em]">
                {isPending ? 'RESULTADO PARA CONFIRMAR' : 'RESULTADO'}
              </p>
              <h2 id={`confirm-title-${match.id}`} className="mt-1 pr-8 text-xl font-black">
                {creator.profileId === currentUserId ? 'Você' : creator.name} registrou uma partida
                {isPending ? ' contra você' : ''}
              </h2>
              <p className="text-muted-foreground mt-1 text-xs">{formatDateTime(match.playedAt)}</p>

              <div className="bg-background/70 border-border mt-6 grid grid-cols-[1fr_auto_1fr] items-end gap-3 rounded-2xl border px-4 pt-7 pb-5">
                <PlayerColumn
                  player={a}
                  isYou={a.profileId === currentUserId}
                  won={a.score > b.score}
                />
                <span className="text-muted-foreground pb-3 font-mono text-lg">×</span>
                <PlayerColumn
                  player={b}
                  isYou={b.profileId === currentUserId}
                  won={b.score > a.score}
                />
              </div>

              <p
                className={`mt-4 text-center text-sm font-bold ${isDraw ? 'text-warning' : iWon ? 'text-success' : 'text-danger'}`}
              >
                {isDraw ? 'Empate' : iWon ? 'Você venceu' : 'Você perdeu'} {me.score}×{rival.score}
              </p>

              {!isPending ? (
                <p className="text-muted-foreground mt-4 text-center text-sm">
                  {match.status === 'confirmed'
                    ? 'Esta partida já foi confirmada e está no ranking.'
                    : match.status === 'disputed'
                      ? 'Esta partida está em análise pelo administrador.'
                      : match.status === 'cancelled'
                        ? 'Esta partida foi cancelada.'
                        : match.status === 'drawn'
                          ? 'Empate pendente: não conta no ranking. Joguem o desempate e registrem o resultado.'
                          : 'Aguardando o adversário confirmar.'}
                </p>
              ) : step === 'review' ? (
                <>
                  <p className="text-muted-foreground mt-2 text-center text-xs">
                    O placar só conta no ranking se você aceitar.
                  </p>
                  <div className="mt-6 grid gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => confirmMatch(match.id), 'accepted')}
                      className="bg-success w-full rounded-2xl px-4 py-4 text-base font-black text-black shadow-[0_10px_30px_rgba(34,197,94,.25)] transition active:scale-[.98] disabled:opacity-60"
                    >
                      {pending ? 'Confirmando…' : 'Aceitar resultado'}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setStep('refuse')}
                      className="border-border text-muted-foreground w-full rounded-2xl border px-4 py-3.5 text-sm font-bold hover:text-white disabled:opacity-60"
                    >
                      Recusar
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-5">
                  <div className="border-warning/40 bg-warning/10 rounded-2xl border p-4">
                    <div className="text-warning flex items-center gap-2 font-black">
                      <Frown className="size-5" aria-hidden="true" /> Tem certeza?
                    </div>
                    <p className="mt-2 text-sm leading-6">
                      Ao recusar, você recebe a tag <BadLoserTag compact />{' '}
                      <strong>Mal perdedor</strong> no seu perfil, visível para todos, até um
                      administrador removê-la. A partida vai para análise.
                    </p>
                  </div>
                  <label className="mt-4 block text-sm font-medium">
                    Conte o que aconteceu <span className="text-muted-foreground">(opcional)</span>
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      maxLength={500}
                      rows={2}
                      className="border-border bg-background mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setStep('review')}
                      className="border-border rounded-2xl border px-3 py-3.5 text-sm font-bold disabled:opacity-60"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => disputeMatch({ matchId: match.id, reason: reason || undefined }),
                          'refused',
                        )
                      }
                      className="bg-danger rounded-2xl px-3 py-3.5 text-sm font-black text-white disabled:opacity-60"
                    >
                      {pending ? 'Enviando…' : 'Recusar mesmo assim'}
                    </button>
                  </div>
                </div>
              )}

              {error ? (
                <p role="alert" className="text-danger mt-4 text-center text-sm">
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
