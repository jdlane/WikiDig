import { depthScore } from '../lib/scoring';
import { getStats } from '../lib/storage';
import { Modal } from './Modal';

export function StatsModal({ todayKey, onClose }: { todayKey: string; onClose: () => void }) {
  const stats = getStats(todayKey);
  const items = [
    { label: 'Played', value: stats.played },
    { label: 'Avg score', value: depthScore(stats.averageDepth).toLocaleString() },
    { label: 'Best score', value: depthScore(stats.bestDepth).toLocaleString() },
    { label: 'Streak', value: stats.currentStreak },
  ];
  return (
    <Modal title="Statistics" onClose={onClose}>
      <div className="stats-grid">
        {items.map((s) => (
          <div key={s.label} className="stat">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
