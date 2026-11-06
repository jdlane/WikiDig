import { MAX_LIVES, depthPercent, depthScore } from './scoring';
import type { StoredResult } from './storage';

const SQUARES = 10;

export function buildShareText(puzzleNumber: number, title: string, result: StoredResult): string {
  const found = result.index >= 0;
  const filled = found ? Math.max(1, Math.round(result.depth * SQUARES)) : 1;
  const bar = (found ? '🟩' : '🟥').repeat(filled) + '⬜'.repeat(SQUARES - filled);
  const used = result.misses?.length ?? 0;
  const lives = '❤️'.repeat(MAX_LIVES - used) + '🖤'.repeat(used);
  const line = found
    ? `${depthScore(result.depth).toLocaleString()} points (${depthPercent(result.depth)}% deep)`
    : '0 points — out of lives!';
  return `Wiki Depth #${puzzleNumber} — ${title}\n${line}\n${bar} ${lives}\n${window.location.origin}`;
}
