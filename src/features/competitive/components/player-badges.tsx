'use client';

import { createContext, useContext } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { tierColor } from '../domain/tiers';
import type { PlayerBadgeMap } from '../server/get-competitive';

const BadgesContext = createContext<PlayerBadgeMap>({});

/** Shares every player's tier/champion flag with client components (avatar borders). */
export function PlayerBadgesProvider({
  badges,
  children,
}: {
  badges: PlayerBadgeMap;
  children: React.ReactNode;
}) {
  return <BadgesContext.Provider value={badges}>{children}</BadgesContext.Provider>;
}

export function usePlayerBadge(playerId: string) {
  return useContext(BadgesContext)[playerId];
}

/** Avatar with the border of the player's competitive tier (glowing for the monthly champion). */
export function PlayerAvatar({
  playerId,
  name,
  src,
  size = 'md',
  className,
}: {
  playerId: string;
  name: string;
  src: string | null;
  size?: 'sm' | 'md' | 'xl' | 'lg';
  className?: string;
}) {
  const badge = usePlayerBadge(playerId);
  return (
    <Avatar
      name={name}
      src={src}
      size={size}
      className={className ?? ''}
      ringColor={badge ? tierColor(badge.tier) : null}
      champion={badge?.champion ?? false}
    />
  );
}
