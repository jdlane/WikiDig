import { describe, expect, it } from 'vitest';
import { badgesFor } from './badges';
import type { StoredResult } from './storage';

const base: StoredResult = { guess: 'garden', index: 50, total: 100, depth: 0.5, title: 'Bee', misses: ['x'] };
const names = (r: Partial<StoredResult>) => badgesFor({ ...base, ...r }).map((b) => b.name);

describe('badgesFor', () => {
  it('earns nothing for an ordinary dig', () => {
    expect(names({})).toEqual([]);
  });

  it('earns nothing when every pickaxe broke', () => {
    expect(names({ index: -1, depth: 0, misses: ['a', 'b', 'c'], guess: 'c' })).toEqual([]);
  });

  it('awards Clean Dig only with no pickaxes broken', () => {
    expect(names({ misses: [] })).toContain('Clean Dig');
    expect(names({ misses: undefined })).toContain('Clean Dig'); // saved before lives existed
    expect(names({ misses: ['a'] })).not.toContain('Clean Dig');
  });

  it('awards Close Call only on the last pickaxe', () => {
    expect(names({ misses: ['a', 'b'] })).toContain('Close Call');
    expect(names({ misses: ['a'] })).not.toContain('Close Call');
  });

  it('awards Top Answer only when the result says so', () => {
    expect(names({ topAnswer: true })).toContain('Top Answer');
    expect(names({ topAnswer: false })).not.toContain('Top Answer');
    expect(names({ topAnswer: undefined })).not.toContain('Top Answer');
  });

  it('awards Big Word from 12 letters, not counting punctuation', () => {
    expect(names({ guess: 'beekeepingly' })).toContain('Big Word'); // 12
    expect(names({ guess: 'beekeepings' })).not.toContain('Big Word'); // 11
    expect(names({ guess: 'self-reliant' })).not.toContain('Big Word'); // 11 letters + hyphen
  });

  it('awards Small Wonder for a short word at Gold or deeper', () => {
    expect(names({ guess: 'hive', depth: 0.75 })).toContain('Small Wonder');
    expect(names({ guess: 'hive', depth: 0.7499 })).not.toContain('Small Wonder');
    expect(names({ guess: 'hives', depth: 0.95 })).not.toContain('Small Wonder');
  });

  it('can award several badges at once, in display order', () => {
    expect(names({ guess: 'bee', depth: 0.99, misses: [], topAnswer: true })).toEqual([
      'Clean Dig',
      'Top Answer',
      'Small Wonder',
    ]);
  });
});
