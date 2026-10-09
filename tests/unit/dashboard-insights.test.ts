import { describe, expect, it } from 'vitest';
import {
  bestStreakHolder,
  chaseTarget,
  seasonProgress,
} from '@/features/dashboard/domain/insights';

describe('seasonProgress', () => {
  const startsAt = '2026-10-01T03:00:00.000Z';
  const endsAt = '2026-11-01T03:00:00.000Z';

  it('reports elapsed share and whole days left mid-season', () => {
    const progress = seasonProgress(startsAt, endsAt, Date.parse('2026-10-16T15:00:00.000Z'));
    expect(progress.elapsed).toBeCloseTo(0.5, 2);
    expect(progress.daysLeft).toBe(16);
    expect(progress.hasStarted).toBe(true);
    expect(progress.hasEnded).toBe(false);
  });

  it('clamps before the start and after the end', () => {
    const before = seasonProgress(startsAt, endsAt, Date.parse('2026-09-20T00:00:00.000Z'));
    expect(before.elapsed).toBe(0);
    expect(before.hasStarted).toBe(false);

    const after = seasonProgress(startsAt, endsAt, Date.parse('2026-11-05T00:00:00.000Z'));
    expect(after.elapsed).toBe(1);
    expect(after.daysLeft).toBe(0);
    expect(after.hasEnded).toBe(true);
  });
});

describe('chaseTarget', () => {
  const ranking = [
    { playerId: 'a', wins: 5 },
    { playerId: 'b', wins: 3 },
    { playerId: 'c', wins: 3 },
  ];

  it('returns null for the leader and unknown players', () => {
    expect(chaseTarget(ranking, 'a')).toBeNull();
    expect(chaseTarget(ranking, 'zzz')).toBeNull();
  });

  it('returns the player right above and the win gap', () => {
    expect(chaseTarget(ranking, 'b')).toEqual({ target: ranking[0], winsBehind: 2 });
    expect(chaseTarget(ranking, 'c')).toEqual({ target: ranking[1], winsBehind: 0 });
  });
});

describe('bestStreakHolder', () => {
  it('is null while nobody has a streak', () => {
    expect(bestStreakHolder([{ bestStreak: 0 }, { bestStreak: 0 }])).toBeNull();
  });

  it('keeps the first holder on ties (ranking order)', () => {
    const rows = [
      { id: 'a', bestStreak: 2 },
      { id: 'b', bestStreak: 3 },
      { id: 'c', bestStreak: 3 },
    ];
    expect(bestStreakHolder(rows)).toBe(rows[1]);
  });
});
