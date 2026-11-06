import { useState, type FormEvent } from 'react';
import { validateGuess } from '../lib/scoring';

interface Props {
  disabled: boolean;
  onSubmit: (guess: string) => void;
}

export function GuessForm({ disabled, onSubmit }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validateGuess(value);
    setError(problem);
    if (!problem) setConfirming(true);
  };

  if (confirming) {
    return (
      <section className="card guess-card">
        <p className="confirm-text">
          Lock in <strong>“{value.trim()}”</strong>? You only get one guess.
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
      <label htmlFor="guess" className="guess-label">
        Which word first appears deepest in this article?
      </label>
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
      {disabled && <p className="muted">Loading article…</p>}
    </form>
  );
}
