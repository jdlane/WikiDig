import { depthScore } from '../lib/scoring';
import { getEndlessStats, getStats } from '../lib/storage';
import { Modal } from './Modal';

function StatGrid({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="stats-grid">
      {items.map((s) => (
        <div key={s.label} className="stat">
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function StatsModal({ todayKey, onClose }: { todayKey: string; onClose: () => void }) {
  const daily = getStats(todayKey);
  const endless = getEndlessStats();
  return (
    <Modal title="Statistics" onClose={onClose}>
      <h3 className="stats-heading">Daily</h3>
      <StatGrid
        items={[
          { label: 'Played', value: daily.played },
          { label: 'Avg score', value: depthScore(daily.averageDepth).toLocaleString() },
          { label: 'Best score', value: depthScore(daily.bestDepth).toLocaleString() },
          { label: 'Streak', value: daily.currentStreak },
        ]}
      />
      <h3 className="stats-heading">Endless</h3>
      <StatGrid
        items={[
          { label: 'Played', value: endless.played },
          {
            label: 'Avg score',
            value: depthScore(endless.played ? endless.totalDepth / endless.played : 0).toLocaleString(),
          },
          { label: 'Best score', value: depthScore(endless.bestDepth).toLocaleString() },
        ]}
      />
    </Modal>
  );
}
