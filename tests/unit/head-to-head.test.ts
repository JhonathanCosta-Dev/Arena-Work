import { describe, expect, it } from 'vitest';
import { getHeadToHead, opponentRecords } from '@/features/ranking/domain/head-to-head';
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

describe('opponentRecords', () => {
  it('summarises wins and losses against each opponent, most played first', () => {
    expect(opponentRecords('a', matches)).toEqual([
      { opponentId: 'b', wins: 1, losses: 1, total: 2, lastPlayedAt: '2026-10-02T10:00:00Z' },
      { opponentId: 'c', wins: 1, losses: 0, total: 1, lastPlayedAt: '2026-10-03T10:00:00Z' },
    ]);
  });

  it('reads the record from the requested player point of view', () => {
    expect(opponentRecords('b', matches)).toEqual([
      { opponentId: 'a', wins: 1, losses: 1, total: 2, lastPlayedAt: '2026-10-02T10:00:00Z' },
    ]);
  });

  it('breaks ties on games played by the most recent one', () => {
    const records = opponentRecords('a', [
      ...matches,
      {
        id: '4',
        playedAt: '2026-10-04T10:00:00Z',
        sides: [
          { playerId: 'c', score: 11 },
          { playerId: 'a', score: 9 },
        ],
      },
    ]);
    expect(records.map((r) => r.opponentId)).toEqual(['c', 'b']);
  });

  it('ignores matches the player was not in', () => {
    expect(opponentRecords('z', matches)).toEqual([]);
  });
});
