import type { Puzzle } from '../data/puzzles';
import type { GuessResult } from './scoring';
import { toDateKey } from './daily';

// Keys keep the game's original name: changing them would orphan players' saved results.
const RESULTS_KEY = 'wikidepth:results';
const MISSES_KEY = 'wikidepth:misses';
const SEEN_RULES_KEY = 'wikidepth:seenRules';

export interface StoredResult extends GuessResult {
  title: string;
  /** Guesses that weren't in the article, in order. Absent on results saved before lives existed. */
  misses?: string[];
  /** The guess was the deepest possible word. Absent on results saved before badges existed. */
  topAnswer?: boolean;
}

type ResultMap = Record<string, StoredResult>;
type MissMap = Record<string, string[]>;

function readMap<T>(key: string): Record<string, T> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, T>;
  } catch {
    return {};
  }
}

function writeMap<T>(key: string, map: Record<string, T>): void {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* storage unavailable: progress lasts only for this session */
  }
}

const readAll = () => readMap<StoredResult>(RESULTS_KEY);

export function getResult(dateKey: string): StoredResult | null {
  return readAll()[dateKey] ?? null;
}

export function saveResult(dateKey: string, result: StoredResult): void {
  const all: ResultMap = readAll();
  all[dateKey] = result;
  writeMap(RESULTS_KEY, all);
}

/** Missed guesses for a day still in progress. */
export function getMisses(dateKey: string): string[] {
  return readMap<string[]>(MISSES_KEY)[dateKey] ?? [];
}

export function saveMisses(dateKey: string, misses: string[]): void {
  const all: MissMap = readMap<string[]>(MISSES_KEY);
  all[dateKey] = misses;
  writeMap(MISSES_KEY, all);
}

/** Forget everything about a day: final result and lives used. */
export function clearResult(dateKey: string): void {
  const results: ResultMap = readAll();
  delete results[dateKey];
  writeMap(RESULTS_KEY, results);
  const misses: MissMap = readMap<string[]>(MISSES_KEY);
  delete misses[dateKey];
  writeMap(MISSES_KEY, misses);
}

export interface Stats {
  played: number;
  averageDepth: number;
  bestDepth: number;
  currentStreak: number;
}

export function getStats(todayKey: string): Stats {
  const all = readAll();
  const results = Object.values(all);
  const played = results.length;

  // Streak: consecutive played days ending today (or yesterday, if today isn't played yet).
  let streak = 0;
  const [y, m, d] = todayKey.split('-').map(Number);
  const cursor = new Date(y, m - 1, d);
  if (!all[todayKey]) cursor.setDate(cursor.getDate() - 1);
  while (all[toDateKey(cursor)]) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    played,
    averageDepth: played ? results.reduce((sum, r) => sum + r.depth, 0) / played : 0,
    bestDepth: results.reduce((best, r) => Math.max(best, r.depth), 0),
    currentStreak: streak,
  };
}

/** Where one game's progress is saved: a daily date, or the current endless round. */
export interface GameStore {
  getResult(): StoredResult | null;
  saveResult(result: StoredResult): void;
  getMisses(): string[];
  saveMisses(misses: string[]): void;
}

export function dailyStore(dateKey: string): GameStore {
  return {
    getResult: () => getResult(dateKey),
    saveResult: (r) => saveResult(dateKey, r),
    getMisses: () => getMisses(dateKey),
    saveMisses: (m) => saveMisses(dateKey, m),
  };
}

// --- Endless mode ---------------------------------------------------------------------------

const ENDLESS_KEY = 'wikidepth:endless';
const ENDLESS_STATS_KEY = 'wikidepth:endlessStats';

/** The endless round in progress. Saved so a refresh can't reroll the article. */
export interface EndlessRound {
  round: number;
  puzzle: Puzzle | null;
  misses: string[];
  result: StoredResult | null;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function getEndlessRound(): EndlessRound {
  return readJson<EndlessRound>(ENDLESS_KEY, { round: 1, puzzle: null, misses: [], result: null });
}

export function saveEndlessRound(round: EndlessRound): void {
  writeJson(ENDLESS_KEY, round);
}

/** Start the next round (keeps the count going). */
export function nextEndlessRound(): EndlessRound {
  const next = { round: getEndlessRound().round + 1, puzzle: null, misses: [], result: null };
  saveEndlessRound(next);
  return next;
}

const ENDLESS_SEEN_KEY = 'wikidepth:endlessSeen';
/** Most recent endless titles remembered, so storage stays bounded. */
export const ENDLESS_SEEN_LIMIT = 5000;

/** Titles already shown in endless mode, oldest first. */
export function getEndlessSeen(): string[] {
  const seen = readJson<unknown>(ENDLESS_SEEN_KEY, []);
  return Array.isArray(seen) ? seen.filter((t): t is string => typeof t === 'string') : [];
}

export function addEndlessSeen(title: string): void {
  const seen = getEndlessSeen().filter((t) => t !== title);
  seen.push(title);
  writeJson(ENDLESS_SEEN_KEY, seen.slice(-ENDLESS_SEEN_LIMIT));
}

export interface EndlessStats {
  played: number;
  totalDepth: number;
  bestDepth: number;
}

export function getEndlessStats(): EndlessStats {
  return readJson<EndlessStats>(ENDLESS_STATS_KEY, { played: 0, totalDepth: 0, bestDepth: 0 });
}

export function endlessStore(): GameStore {
  const update = (patch: Partial<EndlessRound>) => saveEndlessRound({ ...getEndlessRound(), ...patch });
  return {
    getResult: () => getEndlessRound().result,
    saveResult: (result) => {
      if (getEndlessRound().result) return; // count each round once
      update({ result });
      const s = getEndlessStats();
      writeJson(ENDLESS_STATS_KEY, {
        played: s.played + 1,
        totalDepth: s.totalDepth + result.depth,
        bestDepth: Math.max(s.bestDepth, result.depth),
      });
    },
    getMisses: () => getEndlessRound().misses,
    saveMisses: (misses) => update({ misses }),
  };
}

export function hasSeenRules(): boolean {
  try {
    return localStorage.getItem(SEEN_RULES_KEY) === '1';
  } catch {
    return true;
  }
}

export function markRulesSeen(): void {
  try {
    localStorage.setItem(SEEN_RULES_KEY, '1');
  } catch {
    /* ignore */
  }
}
