export interface Puzzle {
  /** Wikipedia article title, as it appears in the URL (spaces are fine). */
  title: string;
  /** Pin a specific revision so every player sees identical text that day. */
  revisionId?: number;
}

/** A puzzle pinned to a specific day, overriding the pool. */
export interface DatedPuzzle extends Puzzle {
  date: string;
}

/** Day 1 of the game; puzzle numbers count from here. Day N plays pool entry N-1. */
export const LAUNCH_DATE = '2026-11-01';

/** Hand-picked puzzles for special days (holidays, anniversaries). */
export const OVERRIDES: DatedPuzzle[] = [];

/** Used only if public/pool.json (built by `npm run build:pool`) can't be loaded. */
export const FALLBACK_POOL: Puzzle[] = [
  { title: 'Octopus' },
  { title: 'Eiffel Tower' },
  { title: 'Chess' },
  { title: 'Honey bee' },
  { title: 'Volcano' },
  { title: 'Pizza' },
  { title: 'Great Wall of China' },
  { title: 'Saturn' },
  { title: 'Violin' },
  { title: 'Tea' },
  { title: 'Penguin' },
  { title: 'Lighthouse' },
];
