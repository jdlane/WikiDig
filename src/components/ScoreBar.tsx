import { depthPercent, depthScore, materialFor } from '../lib/scoring';
import type { StoredResult } from '../lib/storage';

/** Whether an observed element has scrolled off the top of the screen (not merely below it). */
export function isScrolledPast(entry: Pick<IntersectionObserverEntry, 'isIntersecting' | 'boundingClientRect'>): boolean {
  return !entry.isIntersecting && entry.boundingClientRect.top < 0;
}

interface Props {
  result: StoredResult;
  /** Shown while the full result card is scrolled out of view. */
  visible: boolean;
  copied: boolean;
  onShare: () => void;
  /** Endless mode: the next article. */
  onNext?: () => void;
  /** Bring the full result card back into view. */
  onJumpToResult: () => void;
}

/** A compact copy of the result, pinned to the top while the player reads the article. */
export function ScoreBar({ result, visible, copied, onShare, onNext, onJumpToResult }: Props) {
  const found = result.index >= 0;
  const material = materialFor(result);
  return (
    <div className={visible ? 'score-bar visible' : 'score-bar'}>
      <div className="score-bar-inner">
        <button className="score-bar-summary" onClick={onJumpToResult} aria-label="Back to your result">
          {found ? (
            <>
              <span className="score-bar-guess">“{result.guess}”</span>
              <span className="score-bar-score">
                {material.emoji} {depthScore(result.depth).toLocaleString()}
              </span>
              <span className="muted">{depthPercent(result.depth)}%</span>
            </>
          ) : (
            <>
              <span className="score-bar-guess">Out of pickaxes</span>
              <span className="score-bar-score miss">0</span>
            </>
          )}
        </button>
        <button className="button secondary small" onClick={onShare}>
          {copied ? 'Copied!' : 'Share'}
        </button>
        {onNext && (
          <button className="button primary small" onClick={onNext}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
