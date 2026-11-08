import { describe, expect, it } from 'vitest';
import {
  MAX_LIVES,
  applyGuess,
  computeScore,
  depthScore,
  materialFor,
  normalizeWord,
  sameWord,
  topAnswers,
  validateGuess,
  wordKeys,
} from './scoring';
import { loadWordForms } from './wordForms';

await loadWordForms();

const words = ['the', 'cafe', 'is', 'near', 'the', "o'brien", 'house'].map(wordKeys);

describe('normalizeWord', () => {
  it('lowercases, strips accents and unifies apostrophes', () => {
    expect(normalizeWord('Café')).toBe('cafe');
    expect(normalizeWord('O’Brien')).toBe("o'brien");
  });
});

describe('sameWord', () => {
  const same = (a: string, b: string) => expect(sameWord(a, b), `${a} ~ ${b}`).toBe(true);
  const different = (a: string, b: string) => expect(sameWord(a, b), `${a} ≁ ${b}`).toBe(false);

  it('joins plurals and case', () => {
    same('Beehive', 'beehives');
    same('octopus', 'octopuses');
    same('bee', 'Bees');
    same('colony', 'colonies');
    same('mouse', 'mice');
    same('child', 'children');
    same('larva', 'larvae');
  });

  it('joins tenses, including irregular ones', () => {
    same('pollinate', 'pollinated');
    same('run', 'running');
    same('run', 'ran');
    same('write', 'wrote');
    same('write', 'written');
    same('be', 'was');
    same('study', 'studies');
  });

  it('joins agent nouns and activities', () => {
    same('beekeeper', 'beekeeping');
    same('beekeepers', 'beekeeping');
    same('farmer', 'farming');
    same('writer', 'write');
    same('runner', 'running');
  });

  it('joins -ation and -ction nouns to their verbs', () => {
    same('pollination', 'pollinate');
    same('formation', 'formed');
    same('protection', 'protecting');
  });

  it('ignores possessives', () => {
    same("queen's", 'queen');
  });

  it('keeps look-alike words apart', () => {
    different('flower', 'flow');
    different('letter', 'let');
    different('tower', 'tow');
    different('universe', 'university');
    different('news', 'new');
    different('general', 'generate');
    different('station', 'state');
    different('question', 'quest');
    different('nation', 'nate');
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

  it('matches other forms of a word', () => {
    expect(computeScore(words, 'houses')).toMatchObject({ index: 6 });
  });

  it('gives 0 when the word is missing', () => {
    expect(computeScore(words, 'garden')).toMatchObject({ index: -1, depth: 0 });
  });
});

describe('depthScore', () => {
  it('is percent depth × 100', () => {
    expect(depthScore(0.8734)).toBe(8734);
    expect(depthScore(0)).toBe(0);
    expect(depthScore(6 / 7)).toBe(8571);
  });
});

describe('materialFor', () => {
  it.each([
    [0, 'Dirt'],
    [0.1499, 'Dirt'],
    [0.15, 'Coal'],
    [0.2999, 'Coal'],
    [0.3, 'Copper'],
    [0.4499, 'Copper'],
    [0.45, 'Iron'],
    [0.5999, 'Iron'],
    [0.6, 'Silver'],
    [0.7499, 'Silver'],
    [0.75, 'Gold'],
    [0.8999, 'Gold'],
    [0.9, 'Diamond'],
    [0.9899, 'Diamond'],
    [0.99, 'Magma'],
    [0.9999, 'Magma'],
  ])('at depth %d is %s', (depth, name) => {
    expect(materialFor({ index: 0, total: 100_000, depth }).name).toBe(name);
  });

  it("awards Earth's Core for the very last word", () => {
    expect(materialFor({ index: 99, total: 100, depth: 0.99 }).name).toBe("Earth's Core");
  });

  it("awards Earth's Core for the last word of a short article, even below 99%", () => {
    expect(materialFor({ index: 59, total: 60, depth: 59 / 60 }).name).toBe("Earth's Core");
  });

  it("does not award Earth's Core for the second-to-last word", () => {
    expect(materialFor({ index: 98, total: 100, depth: 0.98 }).name).toBe('Diamond');
  });

  it("does not award Earth's Core for a miss", () => {
    expect(materialFor({ index: -1, total: 0, depth: 0 }).name).toBe('Dirt');
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

describe('applyGuess', () => {
  it('ends the game on the first word that is in the article', () => {
    const out = applyGuess(words, ['zebra'], 'house');
    expect(out.misses).toEqual(['zebra']);
    expect(out.final).toMatchObject({ guess: 'house', index: 6 });
  });

  it('costs a life and continues when the word is missing', () => {
    expect(applyGuess(words, [], 'zebra')).toEqual({ misses: ['zebra'], final: null });
  });

  it('scores 0 once all lives are gone', () => {
    const out = applyGuess(words, ['zebra', 'yak'], 'xylophone');
    expect(out.misses).toHaveLength(MAX_LIVES);
    expect(out.final).toMatchObject({ index: -1, depth: 0 });
  });

  it('does not charge a life for repeating a miss, in any form', () => {
    const misses = ['zebra'];
    expect(applyGuess(words, misses, 'ZEBRA')).toEqual({ misses, final: null });
    expect(applyGuess(words, misses, 'zebras')).toEqual({ misses, final: null });
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
