import { describe, expect, it } from 'vitest';
import { isPlayableTitle } from '../data/articleRules';
import { pickTitle } from './randomArticle';

/** A `random` that returns the given values in turn. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('pickTitle', () => {
  const pool = ['A', 'B', 'C', 'D'];

  it('maps the unit interval uniformly across the pool', () => {
    const picks = [0, 0.25, 0.5, 0.75, 0.999999].map((r) => pickTitle(pool, new Set(), () => r));
    expect(picks).toEqual(['A', 'B', 'C', 'D', 'D']);
  });

  it('skips titles that were already seen', () => {
    expect(pickTitle(pool, new Set(['A', 'B']), sequence(0, 0.25, 0.5))).toBe('C');
  });

  it('allows repeats once nearly the whole pool has been seen', () => {
    expect(pickTitle(pool, new Set(pool), () => 0)).toBe('A');
  });

  it('gives up rather than looping forever', () => {
    const big = Array.from({ length: 100 }, (_, i) => `T${i}`);
    expect(pickTitle(big, new Set(['T0']), () => 0)).toBeNull();
  });
});

describe('isPlayableTitle', () => {
  it('accepts ordinary articles and rejects lists and blocked topics', () => {
    expect(isPlayableTitle('Kanpur')).toBe(true);
    expect(isPlayableTitle('List of rivers of Europe')).toBe(false);
    expect(isPlayableTitle('Outline of physics')).toBe(false);
    expect(isPlayableTitle('Rwandan genocide')).toBe(false);
  });
});
