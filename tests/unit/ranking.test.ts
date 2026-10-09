import { describe, expect, it } from 'vitest';
import { calculateRanking, type ConfirmedMatch } from '@/features/ranking/domain/ranking';

function match(
  id: string,
  a: string,
  aScore: number,
  b: string,
  bScore: number,
  minute: number,
): ConfirmedMatch {
  return {
    id,
    playedAt: `2026-10-01T12:${String(minute).padStart(2, '0')}:00Z`,
    sides: [
      { playerId: a, score: aScore },
      { playerId: b, score: bScore },
    ],
  };
}

describe('calculateRanking', () => {
  it('awards 3 points per win and tracks streaks', () => {
    const result = calculateRanking(
      ['a', 'b', 'c'],
      [match('1', 'a', 2, 'b', 0, 1), match('2', 'a', 2, 'c', 1, 2), match('3', 'b', 2, 'a', 1, 3)],
    );

    expect(result.find((row) => row.playerId === 'a')).toMatchObject({
      points: 6,
      wins: 2,
      losses: 1,
      matches: 3,
      bestStreak: 2,
      currentStreak: 0,
    });
  });

  it('uses direct confrontation for a two-player tie', () => {
    const result = calculateRanking(
      ['a', 'b', 'c', 'd'],
      [
        match('1', 'a', 2, 'b', 1, 1),
        match('2', 'a', 0, 'c', 2, 2),
        match('3', 'b', 2, 'd', 0, 3),
        match('4', 'c', 2, 'd', 1, 4),
      ],
    );

    // a and b both have 1 win in 2 matches; a won their direct confrontation.
    expect(result.findIndex((row) => row.playerId === 'a')).toBeLessThan(
      result.findIndex((row) => row.playerId === 'b'),
    );
  });

  it('uses a mini-table for 3+ players tied on wins and win rate', () => {
    const result = calculateRanking(
      ['a', 'b', 'c', 'x', 'y', 'z'],
      [
        // All a/b/c finish 2-2 overall. In the tied-player mini-table: a=2, b=1, c=0.
        match('1', 'a', 2, 'b', 0, 1),
        match('2', 'a', 2, 'c', 1, 2),
        match('3', 'b', 2, 'c', 0, 3),
        match('4', 'x', 2, 'a', 1, 4),
        match('5', 'y', 2, 'a', 0, 5),
        match('6', 'b', 2, 'x', 1, 6),
        match('7', 'y', 2, 'b', 1, 7),
        match('8', 'c', 2, 'x', 0, 8),
        match('9', 'c', 2, 'y', 1, 9),
      ],
    );

    const tied = result.filter((row) => ['a', 'b', 'c'].includes(row.playerId));
    expect(tied.map((row) => row.playerId)).toEqual(['a', 'b', 'c']);
  });

  it('rejects an impossible confirmed tie', () => {
    expect(() => calculateRanking(['a', 'b'], [match('invalid', 'a', 1, 'b', 1, 1)])).toThrow(
      /cannot be tied/,
    );
  });
});
