import { describe, it, expect } from 'vitest';
import { readLocalStorageJson, normalizeActiveNets } from './persistence';
import { sanitizeRules } from './tournament/rules';

describe('readLocalStorageJson', () => {
  it('returns fallback when key is missing', () => {
    expect(readLocalStorageJson('__missing_test_key__', [1, 2])).toEqual([1, 2]);
  });
});

describe('normalizeActiveNets', () => {
  it('converts string keys from Firestore to numeric indices', () => {
    expect(normalizeActiveNets({ '0': 'm1', '1': null })).toEqual({ 0: 'm1', 1: null });
  });

  it('returns empty object for invalid input', () => {
    expect(normalizeActiveNets(null)).toEqual({});
    expect(normalizeActiveNets(undefined)).toEqual({});
  });
});

describe('sanitizeRules', () => {
  it('clamps invalid points and bestOf', () => {
    const r = sanitizeRules({
      pointsToWin: 99 as 25,
      bestOf: 9 as 3,
      thirdSetTo: 21 as 15,
      serveToWin: false,
      winByTwo: true
    });
    expect(r.pointsToWin).toBe(25);
    expect(r.bestOf).toBe(1);
    expect(r.thirdSetTo).toBe(15);
  });
});
