export interface Puzzle {
  /** Optional fixed date (YYYY-MM-DD). Undated puzzles are used as the rotation pool. */
  date?: string;
  /** Wikipedia article title, as it appears in the URL (spaces are fine). */
  title: string;
  /** Pin a specific revision so every player sees identical text that day. */
  revisionId?: number;
}

/** Day 1 of the game; puzzle numbers count from here. */
export const LAUNCH_DATE = '2026-11-01';

export const PUZZLES: Puzzle[] = [
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
