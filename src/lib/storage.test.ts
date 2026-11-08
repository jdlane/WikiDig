import { beforeEach, describe, expect, it } from 'vitest';
import {
  ENDLESS_SEEN_LIMIT,
  addEndlessSeen,
  endlessStore,
  getEndlessRound,
  getEndlessSeen,
  getEndlessStats,
  nextEndlessRound,
  saveEndlessRound,
} from './storage';

beforeEach(() => localStorage.clear());

describe('endless seen titles', () => {
  it('appends titles, keeping each once', () => {
    addEndlessSeen('Bee');
    addEndlessSeen('Ant');
    addEndlessSeen('Bee');
    expect(getEndlessSeen()).toEqual(['Ant', 'Bee']);
  });

  it('drops the oldest titles past the limit', () => {
    const full = Array.from({ length: ENDLESS_SEEN_LIMIT }, (_, i) => `T${i}`);
    localStorage.setItem('wikidepth:endlessSeen', JSON.stringify(full));
    addEndlessSeen('New');
    const seen = getEndlessSeen();
    expect(seen).toHaveLength(ENDLESS_SEEN_LIMIT);
    expect(seen[0]).toBe('T1');
    expect(seen.at(-1)).toBe('New');
  });
});

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
