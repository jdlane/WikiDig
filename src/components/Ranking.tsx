import { useEffect, useState } from 'react';
import {
  bucketFor,
  fetchRanking,
  rankingEnabled,
  submitDailyScore,
  type Ranking as RankingData,
} from '../lib/leaderboard';

interface PanelProps {
  ranking: RankingData;
  score: number;
}

/** How a score compares with the day's other players. Renders nothing until enough have played. */
export function RankingPanel({ ranking, score }: PanelProps) {
  if (!ranking.ranked) return null;
  const pct = Math.round(ranking.beaten * 100);
  const mine = bucketFor(score);
  const tallest = Math.max(...ranking.buckets) || 1;

  return (
    <div className="ranking">
      <p className="ranking-headline">
        You dug deeper than <strong>{pct}%</strong> of today's players
      </p>
      <div className="histogram" role="img" aria-label="How deep today's players dug">
        {ranking.buckets.map((share, i) => (
          <div key={i} className="histogram-col" title={`${i * 10}–${i * 10 + 10}% deep`}>
            <div
              className={i === mine ? 'histogram-bar mine' : 'histogram-bar'}
              style={{ height: `${share ? Math.max(4, (share / tallest) * 100) : 0}%` }}
            />
          </div>
        ))}
      </div>
      <div className="histogram-axis muted">
        <span>Surface</span>
        <span>Deepest</span>
      </div>
    </div>
  );
}

/** Submits today's score, then shows how it ranks. */
export function Ranking({ dateKey, score }: { dateKey: string; score: number }) {
  const [ranking, setRanking] = useState<RankingData | null>(null);

  useEffect(() => {
    if (!rankingEnabled()) return;
    let cancelled = false;
    submitDailyScore(dateKey, score)
      .then(() => fetchRanking(dateKey, score))
      .then((r) => {
        if (!cancelled) setRanking(r);
      });
    return () => {
      cancelled = true;
    };
  }, [dateKey, score]);

  return ranking ? <RankingPanel ranking={ranking} score={score} /> : null;
}
