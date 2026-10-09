import { describe, expect, it } from 'vitest';
import { validatePingPongScore } from '@/features/matches/domain/score';

describe('validatePingPongScore', () => {
  it.each([
    [2, 0],
    [2, 1],
  ])('accepts player A winning %s x %s', (a, b) => {
    expect(validatePingPongScore(a, b)).toBe('playerA');
  });

  it.each([
    [0, 2],
    [1, 2],
  ])('accepts player B winning %s x %s', (a, b) => {
    expect(validatePingPongScore(a, b)).toBe('playerB');
  });

  it.each([
    [0, 0],
    [1, 1],
    [2, 2],
    [1, 0],
    [3, 1],
  ])('rejects invalid score %s x %s', (a, b) => {
    expect(() => validatePingPongScore(a, b)).toThrow();
  });
});
