import { describe, expect, it } from 'vitest';
import { LAUNCH_DATE } from '../data/puzzles';
import { getPuzzleForDate, getPuzzleNumber, shiftDateKey } from './daily';

describe('shiftDateKey', () => {
  it('crosses month and year boundaries', () => {
    expect(shiftDateKey('2026-11-30', 1)).toBe('2026-12-01');
    expect(shiftDateKey('2027-01-01', -1)).toBe('2026-12-31');
  });
});

const pool = [{ title: 'A' }, { title: 'B' }, { title: 'C' }];
const day = (n: number) => shiftDateKey(LAUNCH_DATE, n - 1);

describe('getPuzzleForDate', () => {
  it('plays pool entries in order from launch day', () => {
    expect([1, 2, 3].map((n) => getPuzzleForDate(day(n), pool, []).title)).toEqual(['A', 'B', 'C']);
  });

  it('wraps around when the pool runs out, and before launch', () => {
    expect(getPuzzleForDate(day(4), pool, []).title).toBe('A');
    expect(getPuzzleForDate(day(0), pool, []).title).toBe('C');
  });

  it('prefers a dated override', () => {
    const overrides = [{ date: day(2), title: 'Christmas' }];
    expect(getPuzzleForDate(day(2), pool, overrides).title).toBe('Christmas');
    expect(getPuzzleForDate(day(3), pool, overrides).title).toBe('C');
  });
});

describe('getPuzzleNumber', () => {
  it('counts from launch day', () => {
    expect(getPuzzleNumber(LAUNCH_DATE)).toBe(1);
    expect(getPuzzleNumber(shiftDateKey(LAUNCH_DATE, 5))).toBe(6);
  });
});
