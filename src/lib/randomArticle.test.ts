import { describe, expect, it } from 'vitest';
import { isPlayableTitle } from '../data/articleRules';
import { pickIndex } from './randomArticle';

describe('pickIndex', () => {
  const sizes = [2, 0, 3];

  it('maps the unit interval uniformly across all members', () => {
    const picks = [0, 0.2, 0.4, 0.6, 0.8].map((r) => pickIndex(sizes, r));
    expect(picks).toEqual([
      { category: 0, offset: 0 },
      { category: 0, offset: 1 },
      { category: 2, offset: 0 },
      { category: 2, offset: 1 },
      { category: 2, offset: 2 },
    ]);
  });

  it('never picks an empty category or runs past the end', () => {
    expect(pickIndex(sizes, 0.999999)).toEqual({ category: 2, offset: 2 });
    for (let r = 0; r < 1; r += 0.01) expect(pickIndex(sizes, r).category).not.toBe(1);
  });

  it('fails clearly when there is nothing to pick', () => {
    expect(() => pickIndex([0, 0], 0.5)).toThrow();
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
