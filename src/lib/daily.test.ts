import { describe, expect, it } from 'vitest';
import { LAUNCH_DATE } from '../data/puzzles';
import { getPuzzleForDate, getPuzzleNumber, shiftDateKey } from './daily';

describe('shiftDateKey', () => {
  it('crosses month and year boundaries', () => {
    expect(shiftDateKey('2026-11-30', 1)).toBe('2026-12-01');
    expect(shiftDateKey('2027-01-01', -1)).toBe('2026-12-31');
  });
});

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
    expect(getPuzzleNumber(LAUNCH_DATE)).toBe(1);
    expect(getPuzzleNumber(shiftDateKey(LAUNCH_DATE, 5))).toBe(6);
  });
});
