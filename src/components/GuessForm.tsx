import { useState, type FormEvent } from 'react';
import { MAX_LIVES, sameWord, validateGuess } from '../lib/scoring';

interface Props {
  disabled: boolean;
  /** Earlier guesses that weren't in the article. */
  misses: string[];
  onSubmit: (guess: string) => void;
}

export function Lives({ used }: { used: number }) {
  const left = MAX_LIVES - used;
  return (
    <span className="lives" aria-label={`${left} of ${MAX_LIVES} lives left`}>
      {Array.from({ length: MAX_LIVES }, (_, i) => (
        <span key={i} className={i < left ? 'life' : 'life lost'}>
          {i < left ? '♥' : '♡'}
        </span>
      ))}
    </span>
  );
}

export function GuessForm({ disabled, misses, onSubmit }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const lastMiss = misses.at(-1);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    let problem = validateGuess(value);
    if (!problem && misses.some((m) => sameWord(m, value))) {
      problem = "You already tried that one — it's not in the article.";
    }
    setError(problem);
    if (!problem) setConfirming(true);
  };

  if (confirming) {
    return (
      <section className="card guess-card">
        <p className="confirm-text">
          Lock in <strong>“{value.trim()}”</strong>?
          <br />
          <span className="muted">If it's in the article, that's your final answer.</span>
        </p>
        <div className="button-row">
          <button className="button secondary" onClick={() => setConfirming(false)}>
            Change
          </button>
          <button className="button primary" onClick={() => onSubmit(value.trim())} autoFocus>
            Lock it in
          </button>
        </div>
      </section>
    );
  }

  return (
    <form className="card guess-card" onSubmit={handleSubmit}>
      <div className="guess-header">
        <label htmlFor="guess" className="guess-label">
          Which word first appears deepest in this article?
        </label>
        <Lives used={misses.length} />
      </div>
      {lastMiss && (
        <p className="miss-text">
          “{lastMiss}” isn't in the article — you lost a life. {MAX_LIVES - misses.length} left.
        </p>
      )}
      <div className="guess-row">
        <input
          id="guess"
          className="guess-input"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="Your word"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={disabled}
          autoFocus
        />
        <button className="button primary" type="submit" disabled={disabled}>
          Guess
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
      {misses.length > 0 && (
        <p className="muted missed-list">
          Not in article:{' '}
          {misses.map((m, i) => (
            <span key={m}>
              {i > 0 && ', '}
              <s>{m}</s>
            </span>
          ))}
        </p>
      )}
      {disabled && <p className="muted">Loading article…</p>}
    </form>
  );
}
