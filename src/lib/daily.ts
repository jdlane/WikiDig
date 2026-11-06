import { LAUNCH_DATE, OVERRIDES, type DatedPuzzle, type Puzzle } from '../data/puzzles';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today's date key. In dev, `?date=YYYY-MM-DD` overrides it. */
export function getTodayKey(now = new Date()): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const override = new URLSearchParams(window.location.search).get('date');
    if (override && DATE_RE.test(override)) return override;
  }
  return toDateKey(now);
}

/** Date key `days` away from `dateKey` (negative to go back). */
export function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return toDateKey(new Date(y, m - 1, d + days));
}

function dayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function getPuzzleNumber(dateKey: string): number {
  return dayNumber(dateKey) - dayNumber(LAUNCH_DATE) + 1;
}

/** Index into the pool for a day: day 1 → 0. Wraps if the pool runs out (or before launch). */
export function poolIndexForDate(dateKey: string, poolSize: number): number {
  const n = getPuzzleNumber(dateKey) - 1;
  return ((n % poolSize) + poolSize) % poolSize;
}

export function getPuzzleForDate(
  dateKey: string,
  pool: Puzzle[],
  overrides: DatedPuzzle[] = OVERRIDES,
): Puzzle {
  return overrides.find((p) => p.date === dateKey) ?? pool[poolIndexForDate(dateKey, pool.length)];
}

/** Milliseconds until the next local midnight. */
export function msUntilNextPuzzle(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
