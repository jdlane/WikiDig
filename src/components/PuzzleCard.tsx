interface Props {
  /** Small line above, e.g. "#6 · Friday, November 6". */
  meta: string;
  /** e.g. "Today's article". */
  label: string;
  /** Null while the article is being chosen. */
  title: string | null;
}

export function PuzzleCard({ meta, label, title }: Props) {
  return (
    <section className="card puzzle-card">
      <div className="puzzle-meta">{meta}</div>
      <div className="puzzle-label">{label}</div>
      <h2 className={title ? 'puzzle-title' : 'puzzle-title loading'}>{title ?? 'Loading…'}</h2>
    </section>
  );
}
