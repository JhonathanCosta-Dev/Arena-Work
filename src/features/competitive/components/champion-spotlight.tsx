import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { MEDIA_BUCKETS, mediaUrl } from '@/lib/storage/media';
import type { Champion } from '../server/get-competitive';
import { PlayerAvatar } from './player-badges';

/** Last month's champion stays featured (with a glowing border) until the next season closes. */
export function ChampionSpotlight({ champion, userId }: { champion: Champion; userId: string }) {
  const isYou = champion.playerId === userId;

  return (
    <Link
      href={`/players/${champion.playerId}`}
      className="group via-card to-card relative flex items-center gap-4 overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 p-5 transition hover:border-amber-300/70"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-10 size-48 rounded-full bg-amber-400/20 blur-3xl"
      />
      <PlayerAvatar
        playerId={champion.playerId}
        name={champion.name}
        src={mediaUrl(MEDIA_BUCKETS.profile, champion.avatarPath)}
        size="lg"
      />
      <div className="relative min-w-0">
        <p className="flex items-center gap-1.5 text-[10px] font-black tracking-[0.28em] text-amber-300">
          <Trophy className="size-3.5" aria-hidden="true" /> CAMPEÃO ·{' '}
          {champion.seasonName.toUpperCase()}
        </p>
        <p className="mt-1 truncate text-2xl font-black group-hover:underline">
          {isYou ? 'Você!' : champion.name}
        </p>
        <p className="text-muted-foreground text-sm">
          {champion.wins}V · {champion.losses}D no mês. Em destaque até o próximo campeão.
        </p>
      </div>
    </Link>
  );
}
