import { useEffect, useState } from 'react';
import { msUntilNextPuzzle } from '../lib/daily';
import { depthPercent, depthScore, type GuessResult } from '../lib/scoring';
import { buildShareText } from '../lib/share';

interface Props {
  result: GuessResult;
  puzzleNumber: number;
  title: string;
}

function formatCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function ResultView({ result, puzzleNumber, title }: Props) {
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(msUntilNextPuzzle());
  const found = result.index >= 0;
  const pct = depthPercent(result.depth);

  useEffect(() => {
    const id = setInterval(() => setRemaining(msUntilNextPuzzle()), 1000);
    return () => clearInterval(id);
  }, []);

  const share = async () => {
    const text = buildShareText(puzzleNumber, title, result);
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
          <div className="result-guess">“{result.guess}”</div>
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
              <div className="muted">points · that word isn't in the article.</div>
            </>
          )}
        </div>
      </div>
      <div className="button-row">
        <button className="button primary" onClick={share}>
          {copied ? 'Copied!' : 'Share result'}
        </button>
      </div>
      <p className="muted countdown">Next article in {formatCountdown(remaining)}</p>
    </section>
  );
}
