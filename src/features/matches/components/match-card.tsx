import { formatDateTime } from '@/lib/dates';
import type { MatchSummary } from '../server/get-season-matches';

const statusLabel: Record<MatchSummary['status'], { text: string; className: string }> = {
  pending_confirmation: { text: 'Aguardando confirmação', className: 'text-warning' },
  confirmed: { text: 'Confirmada', className: 'text-success' },
  disputed: { text: 'Em disputa', className: 'text-danger' },
  cancelled: { text: 'Cancelada', className: 'text-muted-foreground' },
};

export function MatchCard({
  match,
  currentUserId,
  children,
}: {
  match: MatchSummary;
  currentUserId?: string;
  children?: React.ReactNode;
}) {
  const [a, b] = match.players;
  const status = statusLabel[match.status];

  return (
    <article className="border-border bg-card rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className={`font-bold ${status.className}`}>{status.text}</span>
        <time dateTime={match.playedAt} className="text-muted-foreground">
          {formatDateTime(match.playedAt)}
        </time>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <PlayerScore player={a} isYou={a.profileId === currentUserId} />
        <span className="text-muted-foreground font-mono text-sm">×</span>
        <PlayerScore player={b} isYou={b.profileId === currentUserId} reversed />
      </div>
      {children}
    </article>
  );
}

function PlayerScore({
  player,
  isYou,
  reversed = false,
}: {
  player: MatchSummary['players'][number];
  isYou: boolean;
  reversed?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 ${reversed ? 'flex-row-reverse text-right' : ''}`}
    >
      <span
        className={`font-mono text-3xl font-black ${player.score === 2 ? 'text-white' : 'text-muted-foreground'}`}
      >
        {player.score}
      </span>
      <span className="min-w-0 truncate text-sm font-bold">{isYou ? 'Você' : player.name}</span>
    </div>
  );
}
