interface Props {
  onHelp: () => void;
  onStats: () => void;
}

export function Header({ onHelp, onStats }: Props) {
  return (
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
  );
}
