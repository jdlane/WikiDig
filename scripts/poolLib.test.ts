import { describe, expect, it } from 'vitest';
import type { PoolEntry } from '../src/lib/pool';
import { filterReason, isBlockedByCategory, mapLimit, mergePool, seededShuffle, type Candidate, type FilterConfig } from './poolLib';

const config: FilterConfig = {
  minBytes: 20_000,
  nonArticleTitles: /^(List|Outline) of /,
  blockedTitlePatterns: [/\bgenocide\b/i],
  blockedCategoryPatterns: [/^Category:Terrorism\b/],
  excludeTitles: new Set(['Vetoed']),
};

const candidate = (over: Partial<Candidate>): Candidate => ({
  title: 'Octopus',
  topic: 'Biology',
  length: 50_000,
  disambiguation: false,
  ...over,
});

describe('filterReason', () => {
  it('passes a long, ordinary article', () => {
    expect(filterReason(candidate({}), config)).toBeNull();
  });

  it('rejects each kind of unsuitable page', () => {
    expect(filterReason(candidate({ title: 'Vetoed' }), config)).toBe('excluded');
    expect(filterReason(candidate({ disambiguation: true }), config)).toBe('disambiguation');
    expect(filterReason(candidate({ title: 'List of rivers' }), config)).toBe('not an article');
    expect(filterReason(candidate({ title: 'Armenian genocide' }), config)).toBe('blocked topic');
    expect(filterReason(candidate({ length: 5_000 }), config)).toBe('too short');
  });
});

describe('isBlockedByCategory', () => {
  it('matches blocked categories only', () => {
    expect(isBlockedByCategory(['Category:Cephalopods', 'Category:Terrorism in Europe'], config)).toBe(true);
    expect(isBlockedByCategory(['Category:Cephalopods'], config)).toBe(false);
  });
});

describe('seededShuffle', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);

  it('is deterministic for a seed and keeps every item', () => {
    const a = seededShuffle(items, 42);
    expect(seededShuffle(items, 42)).toEqual(a);
    expect([...a].sort((x, y) => x - y)).toEqual(items);
    expect(a).not.toEqual(items);
  });

  it('differs between seeds and leaves the input alone', () => {
    expect(seededShuffle(items, 1)).not.toEqual(seededShuffle(items, 2));
    expect(items[0]).toBe(0);
  });
});

describe('mergePool', () => {
  const entry = (title: string, revisionId = 1): PoolEntry => ({ title, revisionId, topic: 'T', words: 2000 });
  const existing = ['A', 'B', 'C', 'D'].map((t) => entry(t));

  it('builds a fresh schedule from nothing', () => {
    const fresh = ['A', 'B', 'C'].map((t) => entry(t));
    const merged = mergePool([], fresh, -1, 7);
    expect(merged.map((e) => e.title).sort()).toEqual(['A', 'B', 'C']);
  });

  it('never changes days already played, even if they no longer pass', () => {
    const fresh = ['C', 'D', 'E'].map((t) => entry(t)); // A and B dropped
    const merged = mergePool(existing, fresh, 1, 7);
    expect(merged.slice(0, 2).map((e) => e.title)).toEqual(['A', 'B']);
  });

  it('drops future entries that no longer pass, and appends new articles', () => {
    const fresh = ['A', 'B', 'D', 'E', 'F'].map((t) => entry(t)); // C dropped
    const merged = mergePool(existing, fresh, 1, 7).map((e) => e.title);
    expect(merged.slice(0, 3)).toEqual(['A', 'B', 'D']);
    expect(merged.slice(3).sort()).toEqual(['E', 'F']);
  });

  it('keeps the pinned revision of scheduled articles', () => {
    const merged = mergePool([entry('A', 111)], [entry('A', 999)], -1, 7);
    expect(merged).toEqual([entry('A', 111)]);
  });
});

describe('mapLimit', () => {
  it('keeps order and respects the concurrency limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapLimit([5, 1, 4, 2, 3], 2, async (n) => {
      peak = Math.max(peak, ++inFlight);
      await new Promise((r) => setTimeout(r, n));
      inFlight--;
      return n * 10;
    });
    expect(out).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBe(2);
  });
});
