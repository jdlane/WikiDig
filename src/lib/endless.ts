import type { Puzzle } from '../data/puzzles';
import { pickRandomPuzzle } from './randomArticle';
import { addEndlessSeen, getEndlessRound, getEndlessSeen, saveEndlessRound } from './storage';

/** A pick started early (while the player reads their result), used by the next round. */
let prefetched: Promise<Puzzle> | null = null;
/** The pick for the round being loaded, shared by overlapping calls. */
let inflight: { round: number; pick: Promise<Puzzle> } | null = null;

/** Titles not to pick again: everything already shown, including the current round. */
function seenTitles(): Set<string> {
  const seen = new Set(getEndlessSeen());
  const current = getEndlessRound().puzzle;
  if (current) seen.add(current.title);
  return seen;
}

export function prefetchNextRandom(): void {
  if (prefetched) return;
  prefetched = pickRandomPuzzle(Math.random, seenTitles());
  prefetched.catch(() => (prefetched = null));
}

/** The current round's article: the saved one, or a fresh random pick that gets saved. */
export function loadEndlessPuzzle(): Promise<Puzzle> {
  const { round, puzzle } = getEndlessRound();
  if (puzzle) {
    addEndlessSeen(puzzle.title); // rounds saved before the seen list existed
    return Promise.resolve(puzzle);
  }
  if (inflight?.round === round) return inflight.pick;

  const source = prefetched ?? pickRandomPuzzle(Math.random, seenTitles());
  prefetched = null;
  const pick = source.then((p) => {
    const current = getEndlessRound();
    if (current.round === round && !current.puzzle) {
      saveEndlessRound({ ...current, puzzle: p });
      addEndlessSeen(p.title);
    }
    return p;
  });
  inflight = { round, pick };
  pick.catch(() => {
    if (inflight?.pick === pick) inflight = null; // allow "Try again"
  });
  return pick;
}
