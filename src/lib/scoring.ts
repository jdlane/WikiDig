/** A word: letters (with combining marks), optionally joined by internal apostrophes (don't, O'Brien). */
export const WORD_RE = /\p{L}[\p{L}\p{M}]*(?:['’]\p{L}[\p{L}\p{M}]*)*/gu;
const SINGLE_WORD_RE = /^\p{L}[\p{L}\p{M}]*(?:['’]\p{L}[\p{L}\p{M}]*)*$/u;

/** Lowercase, strip diacritics, unify apostrophes. */
export function normalizeWord(word: string): string {
  return word
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/’/g, "'")
    .toLowerCase();
}

/** Returns an error message, or null if the guess is acceptable. */
export function validateGuess(raw: string): string | null {
  const guess = raw.trim();
  if (!guess) return 'Enter a word.';
  if (/\s/.test(guess)) return 'One word only.';
  if (!SINGLE_WORD_RE.test(guess)) return 'Letters only — no numbers or symbols.';
  return null;
}

/** Index of the first occurrence of `guess` in the normalized word list, or -1. */
export function findFirstOccurrence(words: string[], guess: string): number {
  return words.indexOf(normalizeWord(guess.trim()));
}

export interface GuessResult {
  guess: string;
  /** Zero-based word index of the first occurrence, or -1 if the word never appears. */
  index: number;
  total: number;
  /** 0–1: how far down the article the word first appears. 0 if not found. */
  depth: number;
}

export function computeScore(words: string[], guess: string): GuessResult {
  const index = findFirstOccurrence(words, guess);
  const total = words.length;
  return {
    guess: guess.trim(),
    index,
    total,
    depth: index < 0 || total === 0 ? 0 : index / total,
  };
}

export function depthPercent(depth: number): number {
  return Math.floor(depth * 100);
}

/** Points: percent depth × 100, so 0–10,000 (87.34% deep → 8,734). */
export function depthScore(depth: number): number {
  return Math.floor(depth * 10_000);
}

export interface TopAnswer {
  /** Display form: the word as written at its first occurrence. */
  word: string;
  index: number;
  depth: number;
}

/** The `n` distinct words whose first occurrence is deepest, best first. */
export function topAnswers(words: string[], originals: string[], n = 10): TopAnswer[] {
  const seen = new Set<string>();
  const firsts: number[] = [];
  words.forEach((w, i) => {
    if (!seen.has(w)) {
      seen.add(w);
      firsts.push(i);
    }
  });
  return firsts
    .slice(-n)
    .reverse()
    .map((index) => ({ word: originals[index], index, depth: index / words.length }));
}
