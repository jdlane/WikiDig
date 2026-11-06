import type { GuessResult } from './scoring';
import { toDateKey } from './daily';

const RESULTS_KEY = 'wikidepth:results';
const SEEN_RULES_KEY = 'wikidepth:seenRules';

export interface StoredResult extends GuessResult {
  title: string;
}

type ResultMap = Record<string, StoredResult>;

function readAll(): ResultMap {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY) ?? '{}') as ResultMap;
  } catch {
    return {};
  }
}

export function getResult(dateKey: string): StoredResult | null {
  return readAll()[dateKey] ?? null;
}

export function saveResult(dateKey: string, result: StoredResult): void {
  const all = readAll();
  all[dateKey] = result;
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable: result lasts only for this session */
  }
}

export function clearResult(dateKey: string): void {
  const all = readAll();
  delete all[dateKey];
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
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
