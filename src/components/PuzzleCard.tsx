interface Props {
  puzzleNumber: number;
  dateKey: string;
  title: string;
}

export function PuzzleCard({ puzzleNumber, dateKey, title }: Props) {
  const date = new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return (
    <section className="card puzzle-card">
      <div className="puzzle-meta">
        #{puzzleNumber} · {date}
      </div>
      <div className="puzzle-label">Today's article</div>
      <h2 className="puzzle-title">{title}</h2>
    </section>
  );
}
