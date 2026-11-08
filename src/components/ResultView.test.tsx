import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { StoredResult } from '../lib/storage';
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
