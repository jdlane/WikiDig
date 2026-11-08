import { useCallback, useEffect, useState } from 'react';
import type { Puzzle } from '../data/puzzles';
import { extractArticle, type Article } from '../lib/extractText';
import { applyGuess, topAnswers } from '../lib/scoring';
import type { GameStore, StoredResult } from '../lib/storage';
import { fetchArticleHtml } from '../lib/wikipedia';
import { loadWordForms } from '../lib/wordForms';

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; article: Article; title: string; revisionId: number };

export interface GameSource {
  /** Changes whenever a different game starts (a new date, the next endless round). */
  id: string;
  /** Which article to play; may pick it (and save the pick) on first call. */
  loadPuzzle: () => Promise<Puzzle>;
  store: GameStore;
}

/** One game: find the article, load it, and play guesses against it under the lives rule. */
export function useGame({ id, loadPuzzle, store }: GameSource) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [result, setResult] = useState<StoredResult | null>(() => store.getResult());
  const [misses, setMisses] = useState<string[]>(() => store.getMisses());
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setResult(store.getResult());
    setMisses(store.getMisses());
    setPuzzle(null);
    // `store` and `loadPuzzle` are recreated alongside `id`.
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    // WordNet downloads alongside the puzzle lookup and article; extraction needs both.
    const wordForms = loadWordForms();
    loadPuzzle()
      .then((p) => {
        if (!cancelled) setPuzzle(p);
        return Promise.all([fetchArticleHtml(p.title, p.revisionId), wordForms] as const);
      })
      .then(([{ html, title, revisionId }]) => {
        if (cancelled) return;
        setState({ status: 'ready', article: extractArticle(html), title, revisionId });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  const submitGuess = useCallback(
    (guess: string) => {
      if (state.status !== 'ready' || result) return;
      const outcome = applyGuess(state.article.keys, misses, guess);
      if (outcome.misses !== misses) {
        setMisses(outcome.misses);
        store.saveMisses(outcome.misses);
      }
      if (outcome.final) {
        const best = topAnswers(state.article.keys, state.article.originals, 1)[0];
        const final: StoredResult = {
          ...outcome.final,
          title: state.title,
          misses: outcome.misses,
          topAnswer: outcome.final.index >= 0 && outcome.final.index === best?.index,
        };
        store.saveResult(final);
        setResult(final);
      }
    },
    [state, result, misses, store],
  );

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  return { state, puzzle, result, misses, submitGuess, retry };
}
