import { badgesFor } from './badges';
import { MAX_LIVES, depthPercent, depthScore, materialFor } from './scoring';
import type { StoredResult } from './storage';

const SQUARES = 10;

export function buildShareText(heading: string, title: string, result: StoredResult): string {
  const found = result.index >= 0;
  const filled = found ? Math.max(1, Math.round(result.depth * SQUARES)) : 1;
  const bar = (found ? '🟩' : '🟥').repeat(filled) + '⬜'.repeat(SQUARES - filled);
  const used = result.misses?.length ?? 0;
  const pickaxes = '⛏️'.repeat(MAX_LIVES - used) + '💥'.repeat(used);
  const material = materialFor(result);
  const badges = badgesFor(result)
    .map((b) => b.emoji)
    .join('');
  const line = found
    ? `${depthScore(result.depth).toLocaleString()} points (${depthPercent(result.depth)}% deep) · ${material.emoji} ${material.name}` +
      (badges ? ` · ${badges}` : '')
    : '0 points — out of pickaxes!';
  return `${heading} — ${title}\n${line}\n${bar} ${pickaxes}`;
}
