import { formatDateTime } from '@/lib/dates';
import type { MatchSummary } from '../server/get-season-matches';

const statusLabel: Record<MatchSummary['status'], { text: string; className: string }> = {
  pending_confirmation: { text: 'Aguardando confirmação', className: 'text-warning' },
  confirmed: { text: 'Confirmada', className: 'text-success' },
  disputed: { text: 'Em disputa', className: 'text-danger' },
  cancelled: { text: 'Cancelada', className: 'text-muted-foreground' },
  drawn: { text: 'Empate pendente', className: 'text-warning' },
};

export function MatchCard({
  match,
  currentUserId,
  perspectiveId,
  showWinnerLabel = false,
  children,
}: {
  match: MatchSummary;
  currentUserId?: string;
  /** Reads the card from this player's side: they are always shown on the left. */
  perspectiveId?: string | undefined;
  /** Writes VITÓRIA above the winner's name. */
  showWinnerLabel?: boolean;
  children?: React.ReactNode;
}) {
  const [first, second] = match.players;
  const [a, b] = second.profileId === perspectiveId ? [second, first] : [first, second];
  const status = statusLabel[match.status];
  const labelWinner = showWinnerLabel && match.status !== 'drawn';

  return (
    <article className="border-border bg-card rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-2">
          <span className={`font-bold ${status.className}`}>{status.text}</span>
          <span className="text-muted-foreground">
            {match.pointsToWin ? `Jogo de ${match.pointsToWin}` : 'Sets'}
          </span>
        </span>
        <time dateTime={match.playedAt} className="text-muted-foreground">
          {formatDateTime(match.playedAt)}
        </time>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <PlayerScore
          player={a}
          isYou={a.profileId === currentUserId}
          isWinner={a.score > b.score}
          showWinnerLabel={labelWinner}
        />
        <span className="text-muted-foreground font-mono text-sm">×</span>
        <PlayerScore
          player={b}
          isYou={b.profileId === currentUserId}
          isWinner={b.score > a.score}
          showWinnerLabel={labelWinner}
          reversed
        />
      </div>
      {children}
    </article>
  );
}

function PlayerScore({
  player,
  isYou,
  isWinner,
  showWinnerLabel,
  reversed = false,
}: {
  player: MatchSummary['players'][number];
  isYou: boolean;
  isWinner: boolean;
  showWinnerLabel: boolean;
  reversed?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 ${reversed ? 'flex-row-reverse text-right' : ''}`}
    >
      <span
        className={`font-mono text-3xl font-black ${isWinner ? 'text-white' : 'text-muted-foreground'}`}
      >
        {player.score}
      </span>
      <span className="flex min-w-0 flex-col">
        {showWinnerLabel && isWinner ? (
          <span className="text-success text-[10px] font-black tracking-[0.18em] uppercase">
            Vitória
          </span>
        ) : null}
        <span className="truncate text-sm font-bold">{isYou ? 'Você' : player.name}</span>
      </span>
    </div>
  );
}
