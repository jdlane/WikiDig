import { beforeEach, describe, expect, it } from 'vitest';
import { endlessStore, getEndlessRound, getEndlessStats, nextEndlessRound, saveEndlessRound } from './storage';

beforeEach(() => localStorage.clear());

describe('moving on from an unfinished endless round', () => {
  it('starts a clean round without touching stats', () => {
    saveEndlessRound({ round: 4, puzzle: { title: 'Bee', revisionId: 1 }, misses: [], result: null });
    nextEndlessRound();
    expect(getEndlessRound()).toEqual({ round: 5, puzzle: null, misses: [], result: null });
    expect(getEndlessStats().played).toBe(0);
  });

  it('still counts finished rounds', () => {
    endlessStore().saveResult({ guess: 'hive', index: 50, total: 100, depth: 0.5, title: 'Bee' });
    expect(getEndlessStats().played).toBe(1);
  });
});
