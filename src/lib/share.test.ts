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

  it("shows Earth's Core for the last word", () => {
    const text = buildShareText('WikiDig #6', 'Bee', { ...base, index: 99, depth: 0.99 });
    expect(text).toContain("🔥 Earth's Core");
  });

  it('adds earned badge emoji to the points line', () => {
    const text = buildShareText('WikiDig #6', 'Bee', { ...base, index: 92, depth: 0.92, misses: [], topAnswer: true });
    expect(text).toContain('💎 Diamond · ✨🏆');
  });

  it('adds no badge separator when none were earned', () => {
    const text = buildShareText('WikiDig #6', 'Bee', {
      ...base,
      guess: 'honeycomb',
      index: 92,
      depth: 0.92,
      misses: ['wings'],
    });
    expect(text.split('\n')[1]).toMatch(/Diamond$/);
  });

  it('shows no material when every pickaxe broke', () => {
    const text = buildShareText('WikiDig #6', 'Bee', { ...base, index: -1, depth: 0, misses: ['a', 'b', 'c'] });
    expect(text).toContain('out of pickaxes');
    expect(text).toContain('💥💥💥');
    expect(text).not.toContain('Dirt');
  });

  it('contains no link', () => {
    const text = buildShareText('WikiDig #6', 'Bee', { ...base, index: 10, depth: 0.1 });
    expect(text).not.toContain('http');
  });

  it('treats results saved before lives existed as having lost none', () => {
    expect(buildShareText('WikiDig #6', 'Bee', { ...base, index: 10, depth: 0.1 })).toContain('⛏️⛏️⛏️');
  });
});
