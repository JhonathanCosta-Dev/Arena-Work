import { describe, expect, it } from 'vitest';
import { validatePingPongScore } from '@/features/matches/domain/score';

describe('validatePingPongScore', () => {
  it.each([
    [2, 0],
    [2, 1],
    [1, 0],
  ])('accepts player A winning %s x %s', (a, b) => {
    expect(validatePingPongScore(a, b)).toBe('playerA');
  });

  it.each([
    [0, 2],
    [1, 2],
    [0, 1],
  ])('accepts player B winning %s x %s', (a, b) => {
    expect(validatePingPongScore(a, b)).toBe('playerB');
  });

  it('treats 1 x 1 as a pending draw', () => {
    expect(validatePingPongScore(1, 1)).toBe('draw');
  });

  it.each([
    [0, 0],
    [2, 2],
    [3, 1],
    [2, 3],
  ])('rejects invalid score %s x %s', (a, b) => {
    expect(() => validatePingPongScore(a, b)).toThrow();
  });
});
