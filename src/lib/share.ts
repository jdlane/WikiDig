import { depthPercent, depthScore, type GuessResult } from './scoring';

const SQUARES = 10;

export function buildShareText(puzzleNumber: number, title: string, result: GuessResult): string {
  const found = result.index >= 0;
  const filled = found ? Math.max(1, Math.round(result.depth * SQUARES)) : 1;
  const bar = (found ? '🟩' : '🟥').repeat(filled) + '⬜'.repeat(SQUARES - filled);
  const line = found
    ? `${depthScore(result.depth).toLocaleString()} points (${depthPercent(result.depth)}% deep)`
    : '0 points — not on the page!';
  return `Wiki Depth #${puzzleNumber} — ${title}\n${line}\n${bar}\n${window.location.origin}`;
}
