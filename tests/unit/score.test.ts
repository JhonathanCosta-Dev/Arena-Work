import { describe, expect, it } from 'vitest';
import { validateGameScore } from '@/features/matches/domain/score';

describe('validateGameScore', () => {
  it.each([
    [11, 11, 0],
    [11, 11, 7],
    [11, 11, 9],
    [11, 12, 10],
    [11, 15, 13],
    [21, 21, 19],
    [21, 23, 21],
  ])('accepts player A winning a game to %s: %s x %s', (target, a, b) => {
    expect(validateGameScore(target, a, b)).toBe('playerA');
  });

  it.each([
    [11, 7, 11],
    [11, 10, 12],
    [21, 5, 21],
  ])('accepts player B winning a game to %s: %s x %s', (target, a, b) => {
    expect(validateGameScore(target, a, b)).toBe('playerB');
  });

  it.each([
    [11, 11, 10],
    [11, 10, 8],
    [11, 13, 10],
    [11, 11, 11],
    [11, 12, 9],
    [21, 21, 20],
    [21, 11, 7],
    [11, -1, 11],
    [11, 11.5, 9],
  ])('rejects an impossible game to %s: %s x %s', (target, a, b) => {
    expect(() => validateGameScore(target, a, b)).toThrow();
  });

  it.each([15, 0, 2])('rejects unsupported game length %s', (target) => {
    expect(() => validateGameScore(target, target, 0)).toThrow();
  });
});
