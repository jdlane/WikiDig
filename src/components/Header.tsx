export type Mode = 'daily' | 'endless';

interface Props {
  mode: Mode;
  onMode: (mode: Mode) => void;
  onHelp: () => void;
  onStats: () => void;
}

const MODES: { value: Mode; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'endless', label: 'Endless' },
];

export function Header({ mode, onMode, onHelp, onStats }: Props) {
  return (
    <>
      <header className="header">
        <button className="icon-button" onClick={onHelp} aria-label="How to play">
          ?
        </button>
        <h1>
          Wiki <span className="accent">Depth</span>
        </h1>
        <button className="icon-button" onClick={onStats} aria-label="Statistics">
          ▥
        </button>
      </header>
      <nav className="mode-tabs" aria-label="Game mode">
        {MODES.map((m) => (
          <button
            key={m.value}
            className={m.value === mode ? 'mode-tab active' : 'mode-tab'}
            aria-pressed={m.value === mode}
            onClick={() => onMode(m.value)}
          >
            {m.label}
          </button>
        ))}
      </nav>
    </>
  );
}
