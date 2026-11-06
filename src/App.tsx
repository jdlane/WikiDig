import { useCallback, useMemo, useState } from 'react';
import { DevControls } from './components/DevControls';
import { GameScreen } from './components/GameScreen';
import { Header, type Mode } from './components/Header';
import { HowToPlay } from './components/HowToPlay';
import { StatsModal } from './components/StatsModal';
import type { GameSource } from './hooks/useGame';
import { getPuzzleForDate, getPuzzleNumber, getTodayKey } from './lib/daily';
import { loadEndlessPuzzle, prefetchNextRandom } from './lib/endless';
import { loadPool } from './lib/pool';
import { dailyStore, endlessStore, getEndlessRound, hasSeenRules, markRulesSeen, nextEndlessRound } from './lib/storage';

type ModalName = 'help' | 'stats' | null;

function readMode(): Mode {
  return new URLSearchParams(window.location.search).get('mode') === 'endless' ? 'endless' : 'daily';
}

function writeMode(mode: Mode) {
  const url = new URL(window.location.href);
  if (mode === 'endless') url.searchParams.set('mode', 'endless');
  else url.searchParams.delete('mode');
  window.history.replaceState(null, '', url);
}

export default function App() {
  const todayKey = useMemo(() => getTodayKey(), []);
  const puzzleNumber = getPuzzleNumber(todayKey);
  const [mode, setMode] = useState<Mode>(readMode);
  const [endlessRound, setEndlessRound] = useState(() => getEndlessRound().round);
  const [modal, setModal] = useState<ModalName>(() => (hasSeenRules() ? null : 'help'));

  const closeModal = () => {
    if (modal === 'help') markRulesSeen();
    setModal(null);
  };

  const changeMode = (next: Mode) => {
    writeMode(next);
    setMode(next);
  };

  const source = useMemo<GameSource>(
    () =>
      mode === 'daily'
        ? {
            id: `daily:${todayKey}`,
            loadPuzzle: () => loadPool().then((pool) => getPuzzleForDate(todayKey, pool)),
            store: dailyStore(todayKey),
          }
        : { id: `endless:${endlessRound}`, loadPuzzle: loadEndlessPuzzle, store: endlessStore() },
    [mode, todayKey, endlessRound],
  );

  const nextEndless = useCallback(() => {
    setEndlessRound(nextEndlessRound().round);
    window.scrollTo({ top: 0 });
  }, []);

  const date = new Date(`${todayKey}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="app">
      {import.meta.env.DEV && mode === 'daily' && <DevControls dateKey={todayKey} />}
      <Header mode={mode} onMode={changeMode} onHelp={() => setModal('help')} onStats={() => setModal('stats')} />
      <main className="main">
        {mode === 'daily' ? (
          <GameScreen
            key={source.id}
            source={source}
            meta={`#${puzzleNumber} · ${date}`}
            label="Today's article"
            shareHeading={`Wiki Depth #${puzzleNumber}`}
          />
        ) : (
          <GameScreen
            key={source.id}
            source={source}
            meta={`Endless · Round ${endlessRound}`}
            label="Random vital article"
            shareHeading="Wiki Depth Endless"
            onNext={nextEndless}
            onFinished={prefetchNextRandom}
          />
        )}
      </main>

      {modal === 'help' && <HowToPlay onClose={closeModal} />}
      {modal === 'stats' && <StatsModal todayKey={todayKey} onClose={closeModal} />}
    </div>
  );
}
