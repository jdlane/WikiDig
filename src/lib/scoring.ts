import { wordFamilies } from './wordForms';

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

/**
 * Family keys for a word; two words are the same if their keys overlap
 * (case, accents, plurals, tenses and some suffixes ignored — see wordForms.ts).
 * Requires loadWordForms() to have resolved.
 */
export function wordKeys(word: string): string[] {
  return wordFamilies(normalizeWord(word.trim()));
}

export function sharesKey(a: string[], b: string[]): boolean {
  return a.some((k) => b.includes(k));
}

export function sameWord(a: string, b: string): boolean {
  return sharesKey(wordKeys(a), wordKeys(b));
}

/** Guesses not found in the article cost a life (shown to players as a pickaxe); running out scores 0. */
export const MAX_LIVES = 3;

/** Returns an error message, or null if the guess is acceptable. */
export function validateGuess(raw: string): string | null {
  const guess = raw.trim();
  if (!guess) return 'Enter a word.';
  if (/\s/.test(guess)) return 'One word only.';
  if (!SINGLE_WORD_RE.test(guess)) return 'Letters only — no numbers or symbols.';
  return null;
}

/** Index of the first word in the article (as per-word keys) that is a form of `guess`, or -1. */
export function findFirstOccurrence(keys: string[][], guess: string): number {
  const target = wordKeys(guess);
  return keys.findIndex((k) => sharesKey(k, target));
}

export interface GuessResult {
  guess: string;
  /** Zero-based word index of the first occurrence, or -1 if the word never appears. */
  index: number;
  total: number;
  /** 0–1: how far down the article the word first appears. 0 if not found. */
  depth: number;
}

export function computeScore(keys: string[][], guess: string): GuessResult {
  const index = findFirstOccurrence(keys, guess);
  const total = keys.length;
  return {
    guess: guess.trim(),
    index,
    total,
    depth: index < 0 || total === 0 ? 0 : index / total,
  };
}

export interface GuessOutcome {
  misses: string[];
  /** Set when the game is over: a word in the article, or the last life lost (index -1). */
  final: GuessResult | null;
}

/** Apply one guess under the lives rule. Repeating (any form of) an earlier miss is a no-op. */
export function applyGuess(keys: string[][], misses: string[], guess: string): GuessOutcome {
  if (misses.some((m) => sameWord(m, guess))) return { misses, final: null };
  const scored = computeScore(keys, guess);
  if (scored.index >= 0) return { misses, final: scored };
  const nextMisses = [...misses, scored.guess];
  return { misses: nextMisses, final: nextMisses.length >= MAX_LIVES ? scored : null };
}

export function depthPercent(depth: number): number {
  return Math.floor(depth * 100);
}

/** Points: percent depth × 100, so 0–10,000 (87.34% deep → 8,734). */
export function depthScore(depth: number): number {
  return Math.floor(depth * 10_000);
}

export interface Material {
  name: string;
  emoji: string;
  /** The shallowest depth (0–1) that earns this material. */
  minDepth: number;
}

/** What a dig turns up, shallowest first. */
export const MATERIALS: readonly Material[] = [
  { name: 'Dirt', emoji: '🟫', minDepth: 0 },
  { name: 'Coal', emoji: '⚫', minDepth: 0.15 },
  { name: 'Copper', emoji: '🟠', minDepth: 0.3 },
  { name: 'Iron', emoji: '🔩', minDepth: 0.45 },
  { name: 'Silver', emoji: '⚪', minDepth: 0.6 },
  { name: 'Gold', emoji: '💰', minDepth: 0.75 },
  { name: 'Diamond', emoji: '💎', minDepth: 0.9 },
  { name: 'Magma', emoji: '🌋', minDepth: 0.99 },
];

/**
 * A secret tier for guessing the article's very last word. Kept out of MATERIALS so the
 * rules never list it. Checked by position: the last word's depth is (total-1)/total, which
 * in a short article can fall below Magma.
 */
export const EARTHS_CORE: Material = { name: "Earth's Core", emoji: '🔥', minDepth: 1 };

/** The deepest material a guess reached. */
export function materialFor({ index, total, depth }: Pick<GuessResult, 'index' | 'total' | 'depth'>): Material {
  if (index >= 0 && total > 0 && index === total - 1) return EARTHS_CORE;
  return MATERIALS.reduce((best, m) => (depth >= m.minDepth ? m : best));
}

export interface TopAnswer {
  /** Display form: the word as written at its first occurrence. */
  word: string;
  index: number;
  depth: number;
}

/**
 * The `n` deepest words that are new where they appear (no form of them occurs earlier),
 * best first. Guessing any of them scores exactly that position.
 */
export function topAnswers(keys: string[][], originals: string[], n = 10): TopAnswer[] {
  const seen = new Set<string>();
  const firsts: number[] = [];
  keys.forEach((k, i) => {
    if (!k.some((key) => seen.has(key))) firsts.push(i);
    k.forEach((key) => seen.add(key));
  });
  return firsts
    .slice(-n)
    .reverse()
    .map((index) => ({ word: originals[index], index, depth: index / keys.length }));
}
