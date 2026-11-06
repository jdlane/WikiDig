import { useCallback, useEffect, useState } from 'react';
import type { Puzzle } from '../data/puzzles';
import { extractArticle, type Article } from '../lib/extractText';
import { applyGuess } from '../lib/scoring';
import { getMisses, getResult, saveMisses, saveResult, type StoredResult } from '../lib/storage';
import { fetchArticleHtml } from '../lib/wikipedia';
import { loadWordForms } from '../lib/wordForms';

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; article: Article; title: string; revisionId: number };

export function useDailyPuzzle(dateKey: string, puzzle: Puzzle) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [result, setResult] = useState<StoredResult | null>(() => getResult(dateKey));
  const [misses, setMisses] = useState<string[]>(() => getMisses(dateKey));
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    // The WordNet data downloads alongside the article; extraction needs both.
    Promise.all([fetchArticleHtml(puzzle.title, puzzle.revisionId), loadWordForms()])
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
  }, [puzzle.title, puzzle.revisionId, reloadToken]);

  useEffect(() => {
    setResult(getResult(dateKey));
    setMisses(getMisses(dateKey));
  }, [dateKey]);

  const submitGuess = useCallback(
    (guess: string) => {
      if (state.status !== 'ready' || result) return;
      const outcome = applyGuess(state.article.keys, misses, guess);
      if (outcome.misses !== misses) {
        setMisses(outcome.misses);
        saveMisses(dateKey, outcome.misses);
      }
      if (outcome.final) {
        const final: StoredResult = { ...outcome.final, title: state.title, misses: outcome.misses };
        saveResult(dateKey, final);
        setResult(final);
      }
    },
    [state, result, misses, dateKey],
  );

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  return { state, result, misses, submitGuess, retry };
}
