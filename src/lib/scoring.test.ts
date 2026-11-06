import { describe, expect, it } from 'vitest';
import { computeScore, depthScore, normalizeWord, topAnswers, validateGuess } from './scoring';

const words = ['the', 'cafe', 'is', 'near', 'the', "o'brien", 'house'];

describe('normalizeWord', () => {
  it('lowercases, strips accents and unifies apostrophes', () => {
    expect(normalizeWord('Café')).toBe('cafe');
    expect(normalizeWord('O’Brien')).toBe("o'brien");
  });
});

describe('computeScore', () => {
  it('uses the first occurrence', () => {
    expect(computeScore(words, 'the')).toMatchObject({ index: 0, depth: 0 });
  });

  it('is case- and accent-insensitive', () => {
    expect(computeScore(words, 'CAFÉ')).toMatchObject({ index: 1, total: 7 });
  });

  it('scores depth as index / total', () => {
    expect(computeScore(words, 'house').depth).toBeCloseTo(6 / 7);
  });

  it('gives 0 when the word is missing', () => {
    expect(computeScore(words, 'houses')).toMatchObject({ index: -1, depth: 0 });
  });
});

describe('depthScore', () => {
  it('is percent depth × 100', () => {
    expect(depthScore(0.8734)).toBe(8734);
    expect(depthScore(0)).toBe(0);
    expect(depthScore(6 / 7)).toBe(8571);
  });
});

describe('topAnswers', () => {
  const originals = ['The', 'café', 'is', 'near', 'the', "O'Brien", 'house'];

  it('ranks distinct words by deepest first occurrence', () => {
    expect(topAnswers(words, originals, 3).map((a) => a.word)).toEqual(['house', "O'Brien", 'near']);
  });

  it('ignores repeat occurrences and handles short articles', () => {
    const all = topAnswers(words, originals, 10);
    expect(all).toHaveLength(6);
    expect(all.at(-1)).toMatchObject({ word: 'The', index: 0 });
  });
});

describe('validateGuess', () => {
  it('accepts single words', () => {
    expect(validateGuess('  octopus ')).toBeNull();
    expect(validateGuess("don't")).toBeNull();
  });

  it('rejects empty, multi-word and non-letter input', () => {
    expect(validateGuess('')).not.toBeNull();
    expect(validateGuess('two words')).not.toBeNull();
    expect(validateGuess('abc123')).not.toBeNull();
    expect(validateGuess('well-known')).not.toBeNull();
  });
});
