import { describe, expect, it } from 'vitest';
import { earnedAchievements, topAchievement } from '@/features/competitive/domain/achievements';
import {
  competitiveRanking,
  rateMatches,
  winValue,
  type RatedMatch,
} from '@/features/competitive/domain/rating';
import { tierFromPoints } from '@/features/competitive/domain/tiers';

let seq = 0;
function match(winner: string, loser: string, loserScore = 1, seasonId = 's1'): RatedMatch {
  seq += 1;
  return {
    id: `m${String(seq).padStart(4, '0')}`,
    playedAt: new Date(Date.UTC(2026, 9, 1, 0, seq)).toISOString(),
    seasonId,
    sides: [
      { playerId: winner, score: 2 },
      { playerId: loser, score: loserScore },
    ],
  };
}

describe('tierFromPoints', () => {
  it('starts at Madeira 1 and climbs by division size', () => {
    expect(tierFromPoints(0).label).toBe('Madeira 1');
    expect(tierFromPoints(49).label).toBe('Madeira 1');
    expect(tierFromPoints(50).label).toBe('Madeira 2');
    expect(tierFromPoints(150).label).toBe('Bronze 1');
    expect(tierFromPoints(1050).label).toBe('Ouro 1');
  });

  it('caps at Imortal 3 with full progress', () => {
    const top = tierFromPoints(999_999);
    expect(top.label).toBe('Imortal 3');
    expect(top.rank).toBe(29);
    expect(top.nextAt).toBeNull();
    expect(top.progress).toBe(1);
  });

  it('reports the next division and progress inside the current one', () => {
    const t = tierFromPoints(75);
    expect(t.label).toBe('Madeira 2');
    expect(t.nextLabel).toBe('Madeira 3');
    expect(t.nextAt).toBe(100);
    expect(t.progress).toBeCloseTo(0.5);
  });
});

describe('winValue', () => {
  it('adds +5 per consecutive win, capped at +25', () => {
    expect(winValue(1)).toBe(25);
    expect(winValue(2)).toBe(30);
    expect(winValue(6)).toBe(50);
    expect(winValue(20)).toBe(50);
  });
});

describe('rateMatches', () => {
  it('rewards streaks and resets them on a loss', () => {
    const { stats } = rateMatches([
      match('a', 'b'),
      match('a', 'b'),
      match('a', 'b'),
      match('b', 'a'),
    ]);
    const a = stats.get('a')!;
    expect(a.points).toBe(25 + 30 + 35 - 10);
    expect(a.bestStreak).toBe(3);
    expect(a.currentStreak).toBe(0);
  });

  it('never lets points go below zero', () => {
    const { stats } = rateMatches([match('a', 'b'), match('a', 'b')]);
    expect(stats.get('b')!.points).toBe(0);
  });

  it('counts flawless wins and wins against a higher tier', () => {
    const climb = Array.from({ length: 6 }, () => match('a', 'c'));
    const { stats } = rateMatches([...climb, match('b', 'a', 0)]);
    expect(stats.get('a')!.flawlessWins).toBe(0);
    expect(stats.get('b')!.flawlessWins).toBe(1);
    expect(stats.get('b')!.giantSlayerWins).toBe(1);
  });

  it('records points at the end of each season without resetting them', () => {
    const { stats, pointsAtSeasonEnd } = rateMatches([
      match('a', 'b', 1, 's1'),
      match('a', 'b', 1, 's2'),
    ]);
    expect(pointsAtSeasonEnd.get('s1')!.get('a')).toBe(25);
    expect(stats.get('a')!.points).toBe(55);
  });

  it('ignores ties', () => {
    const tie: RatedMatch = {
      ...match('a', 'b'),
      sides: [
        { playerId: 'a', score: 1 },
        { playerId: 'b', score: 1 },
      ],
    };
    expect(rateMatches([tie]).stats.size).toBe(0);
  });
});

describe('competitiveRanking', () => {
  it('orders by points and assigns positions', () => {
    const { stats } = rateMatches([match('a', 'b'), match('c', 'b'), match('c', 'a')]);
    const rows = competitiveRanking(stats.values());
    expect(rows.map((r) => r.playerId)).toEqual(['c', 'a', 'b']);
    expect(rows[0]!.position).toBe(1);
  });
});

describe('achievements', () => {
  it('unlocks the 8-win streak medal and picks the most prestigious one', () => {
    const { stats } = rateMatches(Array.from({ length: 8 }, () => match('a', 'b')));
    const earned = earnedAchievements(stats.get('a'), 0);
    expect(earned.has('streak_8')).toBe(true);
    expect(earned.has('streak_12')).toBe(false);
    expect(topAchievement(earned)?.key).toBe('streak_8');
    expect(topAchievement(earnedAchievements(stats.get('a'), 1))?.key).toBe('champion');
  });
});
