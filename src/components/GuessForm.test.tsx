import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GuessForm } from './GuessForm';

const noop = () => {};

function render(props: { misses?: string[]; disabled?: boolean; onSkip?: () => void }) {
  return renderToStaticMarkup(<GuessForm disabled={false} misses={[]} onSubmit={noop} {...props} />);
}

describe('GuessForm skip button', () => {
  it('is offered in endless mode before any miss', () => {
    expect(render({ onSkip: noop })).toContain('Skip article');
  });

  it('is not a submit button, so pressing Enter still guesses', () => {
    expect(render({ onSkip: noop })).toMatch(/<button[^>]*type="button"[^>]*>Skip article/);
  });

  it('is absent in daily mode', () => {
    expect(render({})).not.toContain('Skip article');
  });

  it('disappears once a pickaxe breaks', () => {
    expect(render({ onSkip: noop, misses: ['wings'] })).not.toContain('Skip article');
  });

  it('is disabled while the article loads', () => {
    expect(render({ onSkip: noop, disabled: true })).toMatch(/<button[^>]*disabled=""[^>]*>Skip article/);
  });
});
