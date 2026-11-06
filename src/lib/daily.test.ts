import { describe, expect, it } from 'vitest';
import { getPuzzleForDate, getPuzzleNumber } from './daily';

const puzzles = [{ title: 'A' }, { title: 'B' }, { title: 'C' }, { date: '2026-12-25', title: 'Christmas' }];

describe('getPuzzleForDate', () => {
  it('is deterministic per date', () => {
    expect(getPuzzleForDate('2026-11-10', puzzles)).toBe(getPuzzleForDate('2026-11-10', puzzles));
  });

  it('prefers an exact date match', () => {
    expect(getPuzzleForDate('2026-12-25', puzzles).title).toBe('Christmas');
  });

  it('never picks a dated puzzle for another day', () => {
    for (let d = 1; d <= 28; d++) {
      const key = `2027-02-${String(d).padStart(2, '0')}`;
      expect(getPuzzleForDate(key, puzzles).title).not.toBe('Christmas');
    }
  });
});

describe('getPuzzleNumber', () => {
  it('counts from launch day', () => {
    expect(getPuzzleNumber('2026-11-01')).toBe(1);
    expect(getPuzzleNumber('2026-11-06')).toBe(6);
  });
});
