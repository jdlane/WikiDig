import { useEffect, useState } from 'react';
import { msUntilNextPuzzle } from '../lib/daily';
import { depthPercent, depthScore } from '../lib/scoring';
import { buildShareText } from '../lib/share';
import type { StoredResult } from '../lib/storage';
import { Lives } from './GuessForm';

interface Props {
  result: StoredResult;
  /** First line of the share text, e.g. "Wiki Depth #6". */
  shareHeading: string;
  title: string;
  /** Endless mode: offer the next article instead of a countdown. */
  onNext?: () => void;
}

function formatCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function Countdown() {
  const [remaining, setRemaining] = useState(msUntilNextPuzzle());
  useEffect(() => {
    const id = setInterval(() => setRemaining(msUntilNextPuzzle()), 1000);
    return () => clearInterval(id);
  }, []);
  return <p className="muted countdown">Next article in {formatCountdown(remaining)}</p>;
}

export function ResultView({ result, shareHeading, title, onNext }: Props) {
  const [copied, setCopied] = useState(false);
  const found = result.index >= 0;
  const misses = result.misses ?? [];
  const pct = depthPercent(result.depth);

  const share = async () => {
    const text = buildShareText(shareHeading, title, result);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy your result:', text);
    }
  };

  return (
    <section className="card result-card">
      <div className="result-body">
        <div className="depth-meter" aria-hidden="true">
          <div className="depth-fill" style={{ height: `${found ? Math.max(pct, 2) : 0}%` }} />
          {found && <div className="depth-marker" style={{ top: `${pct}%` }} />}
        </div>
        <div className="result-text">
          <div className="result-guess">
            {found ? `“${result.guess}”` : 'Out of lives'} <Lives used={misses.length} />
          </div>
          {misses.length > 0 && (
            <div className="muted missed-list">
              Missed:{' '}
              {misses.map((m, i) => (
                <span key={m}>
                  {i > 0 && ', '}
                  <s>{m}</s>
                </span>
              ))}
            </div>
          )}
          {found ? (
            <>
              <div className="result-score">{depthScore(result.depth).toLocaleString()}</div>
              <div className="muted">
                points · {pct}% deep · word {(result.index + 1).toLocaleString()} of {result.total.toLocaleString()}
              </div>
            </>
          ) : (
            <>
              <div className="result-score miss">0</div>
              <div className="muted">points · none of your guesses were in the article.</div>
            </>
          )}
        </div>
      </div>
      <div className="button-row">
        <button className={onNext ? 'button secondary' : 'button primary'} onClick={share}>
          {copied ? 'Copied!' : 'Share result'}
        </button>
        {onNext && (
          <button className="button primary" onClick={onNext} autoFocus>
            Next article →
          </button>
        )}
      </div>
      {!onNext && <Countdown />}
    </section>
  );
}
