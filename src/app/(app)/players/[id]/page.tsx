import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { z } from 'zod';
import { PlayerAvatar } from '@/features/competitive/components/player-badges';
import { BadLoserTag } from '@/components/ui/bad-loser-tag';
import { getPlayerSeasonMatches } from '@/features/matches/server/get-season-matches';
import { PlayerHistory } from '@/features/profile/components/player-history';
import { ProfileEditForm } from '@/features/profile/components/profile-edit-form';
import { opponentRecords } from '@/features/ranking/domain/head-to-head';
import { getCurrentRanking } from '@/features/ranking/server/get-current-ranking';
import { CompetitiveCard } from '@/features/competitive/components/competitive-card';
import { TierBadge } from '@/features/competitive/components/tier-emblem';
import { topAchievement } from '@/features/competitive/domain/achievements';
import { getCompetitive } from '@/features/competitive/server/get-competitive';
import { requireUser } from '@/lib/auth/require-user';
import { MEDIA_BUCKETS, mediaUrl } from '@/lib/storage/media';

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vs?: string }>;
}) {
  const [{ id }, { vs }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const { userId, supabase } = await requireUser();
  const [{ data: player }, { season, ranking }, competitive] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, role, avatar_path, banner_path, bad_loser')
      .eq('id', id)
      .maybeSingle(),
    getCurrentRanking(supabase),
    getCompetitive(supabase),
  ]);
  if (!player) notFound();

  const isOwn = player.id === userId;
  const competitiveData = competitive.player(player.id);
  const highlight = topAchievement(competitiveData.earned);
  const row = ranking.find((entry) => entry.playerId === player.id);
  const matches = season ? await getPlayerSeasonMatches(supabase, season.id, player.id) : [];
  const personOf = (profileId: string) => {
    const profile = competitive.profileById.get(profileId);
    return {
      id: profileId,
      name: profile?.name ?? 'Jogador',
      avatarPath: profile?.avatar_path ?? null,
    };
  };
  const records = opponentRecords(
    player.id,
    matches.map((match) => ({
      id: match.id,
      playedAt: match.playedAt,
      sides: [
        { playerId: match.players[0].profileId, score: match.players[0].score },
        { playerId: match.players[1].profileId, score: match.players[1].score },
      ],
    })),
  ).map((record) => {
    const person = personOf(record.opponentId);
    return { ...record, name: person.name, avatarPath: person.avatarPath };
  });
  const selected =
    vs && vs !== player.id && competitive.profileById.has(vs) ? personOf(vs) : null;
  const bannerUrl = mediaUrl(MEDIA_BUCKETS.profile, player.banner_path);
  const avatarUrl = mediaUrl(MEDIA_BUCKETS.profile, player.avatar_path);

  const stats = row
    ? [
        { label: 'Posição', value: row.matches ? `${row.position}º` : '–' },
        { label: 'Pontos', value: row.points },
        { label: 'V–D', value: `${row.wins}–${row.losses}` },
        { label: 'Melhor seq.', value: row.bestStreak },
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="border-border bg-card overflow-hidden rounded-3xl border">
        <div className="from-primary/40 to-card-elevated relative aspect-[3/1] max-h-56 w-full bg-gradient-to-br">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt=""
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
            />
          ) : null}
        </div>
        <div className="px-5 pb-5 sm:px-7">
          <PlayerAvatar
            playerId={player.id}
            name={player.name}
            src={avatarUrl}
            size="lg"
            className="-mt-12"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black sm:text-3xl">{player.name}</h1>
            {player.role === 'admin' ? (
              <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-[11px] font-black">
                ADMIN
              </span>
            ) : null}
            <TierBadge
              tier={competitiveData.tier.key}
              division={competitiveData.tier.division}
              label={competitiveData.tier.label}
            />
            {highlight ? (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] font-black text-amber-300">
                ★ {highlight.name}
              </span>
            ) : null}
            {player.bad_loser ? <BadLoserTag /> : null}
          </div>
          {player.bad_loser ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Recusou um resultado. Só um administrador pode remover a tag.
            </p>
          ) : null}
          {season ? (
            <p className="text-muted-foreground mt-1 text-sm">Temporada {season.name}</p>
          ) : null}

          {stats.length ? (
            <dl className="mt-5 grid grid-cols-4 gap-2 text-center">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-background rounded-xl p-2">
                  <dt className="text-muted-foreground text-[10px] font-bold uppercase">
                    {stat.label}
                  </dt>
                  <dd className="font-mono text-lg font-black">{stat.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>

      <CompetitiveCard data={competitiveData} />

      {isOwn ? (
        <details className="border-border bg-card group rounded-3xl border p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-bold">
            <Pencil className="text-primary size-4" aria-hidden="true" /> Editar perfil
          </summary>
          <div className="mt-5">
            <ProfileEditForm
              userId={userId}
              name={player.name}
              avatarPath={player.avatar_path}
              bannerPath={player.banner_path}
            />
          </div>
        </details>
      ) : null}

      {season ? (
        <PlayerHistory
          player={{ id: player.id, name: player.name, avatarPath: player.avatar_path }}
          viewerId={userId}
          matches={matches}
          records={records}
          selected={selected}
        />
      ) : null}
    </div>
  );
}
