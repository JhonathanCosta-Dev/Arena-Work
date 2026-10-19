import Link from 'next/link';
import { PlayerAvatar } from '@/features/competitive/components/player-badges';
import { MatchCard } from '@/features/matches/components/match-card';
import type { MatchSummary } from '@/features/matches/server/get-season-matches';
import type { OpponentRecord } from '@/features/ranking/domain/head-to-head';
import { MEDIA_BUCKETS, mediaUrl } from '@/lib/storage/media';

export type NamedOpponentRecord = OpponentRecord & { name: string; avatarPath: string | null };
type Person = { id: string; name: string; avatarPath: string | null };

const chipClass =
  'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold whitespace-nowrap transition';

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'page' : undefined}
      className={`${chipClass} ${active ? 'border-primary/60 bg-primary/10 text-white' : 'border-border bg-card text-muted-foreground hover:text-white'}`}
    >
      {children}
    </Link>
  );
}

function HeadToHeadSummary({
  player,
  opponent,
  record,
  viewerId,
}: {
  player: Person;
  opponent: Person;
  record: NamedOpponentRecord | null;
  viewerId: string;
}) {
  const playerLabel = player.id === viewerId ? 'Você' : player.name;
  const opponentLabel = opponent.id === viewerId ? 'Você' : opponent.name;
  const wins = record?.wins ?? 0;
  const losses = record?.losses ?? 0;
  const verdict = !record
    ? `Nenhum jogo contra ${opponent.name} nesta temporada.`
    : wins === losses
      ? 'Confronto empatado. Joguem o desempate!'
      : `${wins > losses ? playerLabel : opponentLabel} lidera o confronto.`;

  return (
    <div className="border-border bg-card mt-4 rounded-2xl border p-5">
      <p className="text-muted-foreground text-center text-[10px] font-black tracking-[0.28em]">
        CONFRONTO DIRETO NA TEMPORADA
      </p>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <div className="flex min-w-0 flex-col items-center gap-2">
          <PlayerAvatar
            playerId={player.id}
            name={player.name}
            src={mediaUrl(MEDIA_BUCKETS.profile, player.avatarPath)}
            size="xl"
          />
          <span className="w-full truncate text-sm font-bold">{playerLabel}</span>
        </div>
        <div className="font-mono text-4xl font-black">
          <span className={wins > losses ? 'text-white' : 'text-muted-foreground'}>{wins}</span>
          <span className="text-muted-foreground mx-2 text-xl">×</span>
          <span className={losses > wins ? 'text-white' : 'text-muted-foreground'}>{losses}</span>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-2">
          <PlayerAvatar
            playerId={opponent.id}
            name={opponent.name}
            src={mediaUrl(MEDIA_BUCKETS.profile, opponent.avatarPath)}
            size="xl"
          />
          <Link
            href={`/players/${opponent.id}`}
            className="w-full truncate text-sm font-bold hover:underline"
          >
            {opponentLabel}
          </Link>
        </div>
      </div>
      <p
        className={`mt-4 text-center text-sm font-bold ${record && wins === losses ? 'text-warning' : 'text-muted-foreground'}`}
      >
        {verdict}
      </p>
    </div>
  );
}

export function PlayerHistory({
  player,
  viewerId,
  matches,
  records,
  selected,
}: {
  player: Person;
  viewerId: string;
  matches: MatchSummary[];
  records: NamedOpponentRecord[];
  selected: Person | null;
}) {
  const shown = selected
    ? matches.filter((match) => match.players.some((p) => p.profileId === selected.id))
    : matches;
  const selectedRecord = selected
    ? (records.find((record) => record.opponentId === selected.id) ?? null)
    : null;

  return (
    <section aria-labelledby="player-history">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="player-history" className="text-lg font-black">
          Histórico na temporada
        </h2>
        <span className="text-muted-foreground text-xs">
          {matches.length === 1 ? '1 jogo' : `${matches.length} jogos`}
        </span>
      </div>

      {records.length ? (
        <nav
          aria-label="Filtrar por adversário"
          className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
        >
          <Chip href={`/players/${player.id}`} active={!selected}>
            Todos
          </Chip>
          {records.map((record) => (
            <Chip
              key={record.opponentId}
              href={`/players/${player.id}?vs=${record.opponentId}`}
              active={selected?.id === record.opponentId}
            >
              <PlayerAvatar
                playerId={record.opponentId}
                name={record.name}
                src={mediaUrl(MEDIA_BUCKETS.profile, record.avatarPath)}
                size="sm"
              />
              {record.opponentId === viewerId ? 'Você' : record.name}
              <span className="text-muted-foreground font-mono text-xs">
                {record.wins}–{record.losses}
              </span>
            </Chip>
          ))}
        </nav>
      ) : null}

      {selected ? (
        <HeadToHeadSummary
          player={player}
          opponent={selected}
          record={selectedRecord}
          viewerId={viewerId}
        />
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {shown.length ? (
          shown.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              currentUserId={viewerId}
              perspectiveId={player.id}
              showWinnerLabel
            />
          ))
        ) : !selected ? (
          <p className="text-muted-foreground text-sm">Nenhum jogo confirmado ainda.</p>
        ) : null}
      </div>
    </section>
  );
}
