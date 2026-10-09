import { describe, expect, it } from 'vitest';
import { getHeadToHead } from '@/features/ranking/domain/head-to-head';
import type { ConfirmedMatch } from '@/features/ranking/domain/ranking';

const matches: ConfirmedMatch[] = [
  {
    id: '1',
    playedAt: '2026-10-01T10:00:00Z',
    sides: [
      { playerId: 'a', score: 2 },
      { playerId: 'b', score: 1 },
    ],
  },
  {
    id: '2',
    playedAt: '2026-10-02T10:00:00Z',
    sides: [
      { playerId: 'b', score: 2 },
      { playerId: 'a', score: 0 },
    ],
  },
  {
    id: '3',
    playedAt: '2026-10-03T10:00:00Z',
    sides: [
      { playerId: 'a', score: 2 },
      { playerId: 'c', score: 0 },
    ],
  },
];

describe('getHeadToHead', () => {
  it('counts only matches between the selected players', () => {
    expect(getHeadToHead('a', 'b', matches)).toMatchObject({
      totalMatches: 2,
      playerAWins: 1,
      playerBWins: 1,
    });
  });
});
