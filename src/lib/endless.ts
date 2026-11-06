import type { Puzzle } from '../data/puzzles';
import { pickRandomPuzzle } from './randomArticle';
import { getEndlessRound, saveEndlessRound } from './storage';

/** A pick started early (while the player reads their result), used by the next round. */
let prefetched: Promise<Puzzle> | null = null;
/** The pick for the round being loaded, shared by overlapping calls. */
let inflight: { round: number; pick: Promise<Puzzle> } | null = null;

export function prefetchNextRandom(): void {
  if (prefetched) return;
  prefetched = pickRandomPuzzle();
  prefetched.catch(() => (prefetched = null));
}

/** The current round's article: the saved one, or a fresh random pick that gets saved. */
export function loadEndlessPuzzle(): Promise<Puzzle> {
  const { round, puzzle } = getEndlessRound();
  if (puzzle) return Promise.resolve(puzzle);
  if (inflight?.round === round) return inflight.pick;

  const source = prefetched ?? pickRandomPuzzle();
  prefetched = null;
  const pick = source.then((p) => {
    const current = getEndlessRound();
    if (current.round === round && !current.puzzle) saveEndlessRound({ ...current, puzzle: p });
    return p;
  });
  inflight = { round, pick };
  pick.catch(() => {
    if (inflight?.pick === pick) inflight = null; // allow "Try again"
  });
  return pick;
}
