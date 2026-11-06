import { useMemo, useState } from 'react';
import { ArticleReveal } from './components/ArticleReveal';
import { DevControls } from './components/DevControls';
import { GuessForm } from './components/GuessForm';
import { Header } from './components/Header';
import { HowToPlay } from './components/HowToPlay';
import { PuzzleCard } from './components/PuzzleCard';
import { ResultView } from './components/ResultView';
import { StatsModal } from './components/StatsModal';
import { TopAnswers } from './components/TopAnswers';
import { useDailyPuzzle } from './hooks/useDailyPuzzle';
import { getPuzzleForDate, getPuzzleNumber, getTodayKey } from './lib/daily';
import { hasSeenRules, markRulesSeen } from './lib/storage';

type ModalName = 'help' | 'stats' | null;

export default function App() {
  const todayKey = useMemo(() => getTodayKey(), []);
  const puzzle = useMemo(() => getPuzzleForDate(todayKey), [todayKey]);
  const puzzleNumber = getPuzzleNumber(todayKey);
  const { state, result, misses, submitGuess, retry } = useDailyPuzzle(todayKey, puzzle);
  const [modal, setModal] = useState<ModalName>(() => (hasSeenRules() ? null : 'help'));

  const closeModal = () => {
    if (modal === 'help') markRulesSeen();
    setModal(null);
  };

  const displayTitle = state.status === 'ready' ? state.title : puzzle.title;

  return (
    <div className="app">
      {import.meta.env.DEV && <DevControls dateKey={todayKey} />}
      <Header onHelp={() => setModal('help')} onStats={() => setModal('stats')} />
      <main className="main">
        <PuzzleCard puzzleNumber={puzzleNumber} dateKey={todayKey} title={displayTitle} />

        {state.status === 'error' && (
          <section className="card error-card">
            <p>Couldn't load the article: {state.message}</p>
            <button className="button secondary" onClick={retry}>
              Try again
            </button>
          </section>
        )}

        {!result && state.status !== 'error' && (
          // Remount after each miss so the input clears and the confirm step resets.
          <GuessForm
            key={misses.length}
            disabled={state.status !== 'ready'}
            misses={misses}
            onSubmit={submitGuess}
          />
        )}

        {result && (
          <>
            <ResultView result={result} puzzleNumber={puzzleNumber} title={displayTitle} />
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
      </main>

      {modal === 'help' && <HowToPlay onClose={closeModal} />}
      {modal === 'stats' && <StatsModal todayKey={todayKey} onClose={closeModal} />}
    </div>
  );
}
