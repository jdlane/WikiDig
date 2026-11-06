import { useCallback, useEffect, useState } from 'react';
import type { Puzzle } from '../data/puzzles';
import { extractArticle, type Article } from '../lib/extractText';
import { computeScore } from '../lib/scoring';
import { getResult, saveResult, type StoredResult } from '../lib/storage';
import { fetchArticleHtml } from '../lib/wikipedia';

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; article: Article; title: string; revisionId: number };

export function useDailyPuzzle(dateKey: string, puzzle: Puzzle) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [result, setResult] = useState<StoredResult | null>(() => getResult(dateKey));
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetchArticleHtml(puzzle.title, puzzle.revisionId)
      .then(({ html, title, revisionId }) => {
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

  useEffect(() => setResult(getResult(dateKey)), [dateKey]);

  const submitGuess = useCallback(
    (guess: string) => {
      if (state.status !== 'ready' || result) return;
      const scored: StoredResult = { ...computeScore(state.article.words, guess), title: state.title };
      saveResult(dateKey, scored);
      setResult(scored);
    },
    [state, result, dateKey],
  );

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  return { state, result, submitGuess, retry };
}
