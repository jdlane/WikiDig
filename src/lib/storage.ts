import type { GuessResult } from './scoring';
import { toDateKey } from './daily';

const RESULTS_KEY = 'wikidepth:results';
const MISSES_KEY = 'wikidepth:misses';
const SEEN_RULES_KEY = 'wikidepth:seenRules';

export interface StoredResult extends GuessResult {
  title: string;
  /** Guesses that weren't in the article, in order. Absent on results saved before lives existed. */
  misses?: string[];
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
