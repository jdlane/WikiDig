import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { StoredResult } from '../lib/storage';
import { RankingPanel } from './Ranking';
import { ResultView } from './ResultView';
import { isScrolledPast } from './ScoreBar';

const rect = (top: number) => ({ top }) as DOMRectReadOnly;

describe('isScrolledPast', () => {
  it('is true once the card has left the top of the screen', () => {
    expect(isScrolledPast({ isIntersecting: false, boundingClientRect: rect(-400) })).toBe(true);
  });

  it('is false while the card is on screen', () => {
    expect(isScrolledPast({ isIntersecting: true, boundingClientRect: rect(-10) })).toBe(false);
  });

  it('is false when the card is below the screen', () => {
    expect(isScrolledPast({ isIntersecting: false, boundingClientRect: rect(900) })).toBe(false);
  });
});

const found: StoredResult = { guess: 'hive', index: 87, total: 100, depth: 0.8734, title: 'Bee', misses: [] };

function bar(markup: string): string {
  return markup.match(/<div class="score-bar[^"]*">[\s\S]*?Back to your result[\s\S]*?<\/div><\/div>/)?.[0] ?? '';
}

describe('ResultView score bar', () => {
  it('starts hidden, with the guess, material and score ready', () => {
    const markup = renderToStaticMarkup(<ResultView result={found} shareHeading="WikiDig #6" title="Bee" />);
    expect(markup).toContain('<div class="score-bar">');
    const b = bar(markup);
    expect(b).toContain('hive');
    expect(b).toContain('💰');
    expect(b).toContain('87%');
    expect(b).not.toContain('Next');
  });

  it('shows earned badges on the result card', () => {
    const markup = renderToStaticMarkup(<ResultView result={found} shareHeading="WikiDig #6" title="Bee" />);
    expect(markup).toContain('class="badge-row"');
    expect(markup).toContain('Clean Dig');
  });

  it('offers the next article in endless mode', () => {
    const markup = renderToStaticMarkup(
      <ResultView result={found} shareHeading="WikiDig Endless" title="Bee" onNext={() => {}} />,
    );
    expect(bar(markup)).toContain('Next →');
  });

  it('shows a zero when every pickaxe broke', () => {
    const lost: StoredResult = { ...found, index: -1, depth: 0, misses: ['a', 'b', 'c'] };
    const b = bar(renderToStaticMarkup(<ResultView result={lost} shareHeading="WikiDig #6" title="Bee" />));
    expect(b).toContain('Out of pickaxes');
    expect(b).toContain('score-bar-score miss');
  });
});

describe('RankingPanel', () => {
  const ranked = { ranked: true, beaten: 0.8, buckets: [0, 0, 0.05, 0.1, 0.14, 0.19, 0.24, 0.14, 0.14, 0] };

  it('stays hidden until the server ranks the day', () => {
    const unranked = { ranked: false, beaten: 0, buckets: Array(10).fill(0) };
    expect(renderToStaticMarkup(<RankingPanel ranking={unranked} score={8734} />)).toBe('');
  });

  it('shows the percentile and histogram once ranked, highlighting the player’s bar', () => {
    const markup = renderToStaticMarkup(<RankingPanel ranking={ranked} score={8734} />);
    expect(markup).toContain('<strong>80%</strong>');
    expect(markup.match(/histogram-bar/g)).toHaveLength(10);
    expect(markup.match(/histogram-bar mine/g)).toHaveLength(1);
  });

  it('never mentions a player count', () => {
    const markup = renderToStaticMarkup(<RankingPanel ranking={ranked} score={8734} />);
    expect(markup).not.toMatch(/\d+ players/);
  });

  it('is not shown on the result card until the ranking loads', () => {
    const markup = renderToStaticMarkup(
      <ResultView result={found} shareHeading="WikiDig #6" title="Bee" rankingDate="2026-11-09" />,
    );
    expect(markup).not.toContain('class="ranking"');
  });
});
