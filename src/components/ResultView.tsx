import { useEffect, useRef, useState } from 'react';
import { badgesFor } from '../lib/badges';
import { msUntilNextPuzzle } from '../lib/daily';
import { depthPercent, depthScore, materialFor } from '../lib/scoring';
import { buildShareText } from '../lib/share';
import type { StoredResult } from '../lib/storage';
import { Pickaxes } from './GuessForm';
import { Ranking } from './Ranking';
import { ScoreBar, isScrolledPast } from './ScoreBar';

interface Props {
  result: StoredResult;
  /** First line of the share text, e.g. "WikiDig #6". */
  shareHeading: string;
  title: string;
  /** Endless mode: offer the next article instead of a countdown. */
  onNext?: () => void;
  /** Daily mode: the date to submit this score under and rank it against. */
  rankingDate?: string;
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

export function ResultView({ result, shareHeading, title, onNext, rankingDate }: Props) {
  const [copied, setCopied] = useState(false);
  const [pinned, setPinned] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const found = result.index >= 0;
  const misses = result.misses ?? [];
  const pct = depthPercent(result.depth);
  const material = materialFor(result);
  const badges = badgesFor(result);

  // Pin a compact copy of the result while this card is scrolled off the top (e.g. after the jump to the word).
  useEffect(() => {
    const card = cardRef.current;
    if (!card || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setPinned(isScrolledPast(entry)));
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const jumpToResult = () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const share = async () => {
    const text = buildShareText(shareHeading, title, result);
    // Native share sheet on touch devices; desktop keeps copy-to-clipboard.
    const mobile = window.matchMedia?.('(pointer: coarse)').matches;
    if (mobile && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return; // user closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy your result:', text);
    }
  };

  return (
    <section className="card result-card" ref={cardRef}>
      <ScoreBar
        result={result}
        visible={pinned}
        copied={copied}
        onShare={share}
        onNext={onNext}
        onJumpToResult={jumpToResult}
      />
      <button
        className={pinned ? 'scroll-top visible' : 'scroll-top'}
        onClick={scrollToTop}
        aria-label="Scroll to top"
        title="Scroll to top"
        tabIndex={pinned ? 0 : -1}
      >
        ↑
      </button>
      <div className="result-body">
        <div className="depth-meter" aria-hidden="true">
          <div className="depth-fill" style={{ height: `${found ? Math.max(pct, 2) : 0}%` }} />
          {found && <div className="depth-marker" style={{ top: `${pct}%` }} />}
        </div>
        <div className="result-text">
          <div className="result-guess">
            {found ? `“${result.guess}”` : 'Out of pickaxes'} <Pickaxes used={misses.length} />
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
              <div className="result-material">
                You struck {material.emoji} <strong>{material.name}</strong>
              </div>
              {badges.length > 0 && (
                <div className="badge-row">
                  {badges.map((b) => (
                    <span key={b.id} className="badge" title={b.description}>
                      {b.emoji} {b.name}
                    </span>
                  ))}
                </div>
              )}
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
      {rankingDate && <Ranking dateKey={rankingDate} score={depthScore(result.depth)} />}
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
