import { useEffect } from 'react';
import { useGame, type GameSource } from '../hooks/useGame';
import { ArticleReveal } from './ArticleReveal';
import { GuessForm } from './GuessForm';
import { PuzzleCard } from './PuzzleCard';
import { ResultView } from './ResultView';
import { TopAnswers } from './TopAnswers';

interface Props {
  source: GameSource;
  meta: string;
  label: string;
  shareHeading: string;
  /** Endless mode: called when the player asks for the next article. */
  onNext?: () => void;
  /** Called once the game has a result (e.g. to start fetching the next article). */
  onFinished?: () => void;
}

/** One playable game. Mount with a `key` per game so state resets between games. */
export function GameScreen({ source, meta, label, shareHeading, onNext, onFinished }: Props) {
  const { state, puzzle, result, misses, submitGuess, retry } = useGame(source);
  const title = state.status === 'ready' ? state.title : (puzzle?.title ?? result?.title ?? null);

  const finished = result !== null;
  useEffect(() => {
    if (finished) onFinished?.();
  }, [finished, onFinished]);

  return (
    <>
      <PuzzleCard
        meta={meta}
        label={label}
        title={title}
        firstSentence={state.status === 'ready' ? state.article.firstSentence : null}
      />

      {state.status === 'error' && (
        <section className="card error-card">
          <p>Couldn't load the article: {state.message}</p>
          <div className="button-row">
            <button className="button secondary" onClick={retry}>
              Try again
            </button>
            {onNext && (
              <button className="button secondary" onClick={onNext}>
                Skip article
              </button>
            )}
          </div>
        </section>
      )}

      {!result && state.status !== 'error' && (
        // Remount after each miss so the input clears and the confirm step resets.
        <GuessForm
          key={misses.length}
          disabled={state.status !== 'ready'}
          misses={misses}
          onSubmit={submitGuess}
          onSkip={onNext}
        />
      )}

      {result && (
        <>
          <ResultView result={result} shareHeading={shareHeading} title={result.title} onNext={onNext} />
          {state.status === 'ready' && <TopAnswers article={state.article} guess={result.guess} />}
          {state.status === 'ready' && (
            <ArticleReveal
              article={state.article}
              title={state.title}
              revisionId={state.revisionId}
              guess={result.guess}
              firstIndex={result.index}
            />
          )}
        </>
      )}
    </>
  );
}
