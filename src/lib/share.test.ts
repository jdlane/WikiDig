import { describe, expect, it } from 'vitest';
import { buildShareText } from './share';

const base = { guess: 'hive', total: 100, title: 'Bee' };

describe('buildShareText', () => {
  it('shows the heading, material and remaining pickaxes', () => {
    const text = buildShareText('WikiDig #6', 'Bee', { ...base, index: 92, depth: 0.92, misses: ['wings'] });
    expect(text).toContain('WikiDig #6 — Bee');
    expect(text).toContain('💎 Diamond');
    expect(text).toContain('⛏️⛏️💥');
  });

  it('shows no material when every pickaxe broke', () => {
    const text = buildShareText('WikiDig #6', 'Bee', { ...base, index: -1, depth: 0, misses: ['a', 'b', 'c'] });
    expect(text).toContain('out of pickaxes');
    expect(text).toContain('💥💥💥');
    expect(text).not.toContain('Dirt');
  });

  it('links to the game on GitHub Pages', () => {
    const text = buildShareText('WikiDig #6', 'Bee', { ...base, index: 10, depth: 0.1 });
    expect(text.endsWith('https://jdlane.github.io/Wikidig/')).toBe(true);
  });

  it('treats results saved before lives existed as having lost none', () => {
    expect(buildShareText('WikiDig #6', 'Bee', { ...base, index: 10, depth: 0.1 })).toContain('⛏️⛏️⛏️');
  });
});
