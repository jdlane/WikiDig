import { MATERIALS, MAX_LIVES } from '../lib/scoring';
import { Modal } from './Modal';

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How to play" onClose={onClose}>
      <div className="rules">
        <p>
          Each day you get the title and opening sentence of one Wikipedia article. Guess a{' '}
          <strong>single word</strong> that you think first appears <strong>as far down the article as possible</strong>.
        </p>
        <ul>
          <li>Only the word's <em>first</em> appearance counts.</li>
          <li>
            You have <strong>{MAX_LIVES} pickaxes</strong>. Guessing a word that isn't in the article breaks one and you
            guess again. Break them all and you score 0.
          </li>
          <li>Your score is your word's depth: 87.34% of the way down = 8,734 points.</li>
          <li>Citations, reference lists, tables, captions, infoboxes, and end sections (See also, References, External links…) don't count.</li>
          <li>
            Every form of a word counts as the same word: <em>beehive</em> = <em>Beehives</em>,{' '}
            <em>beekeeper</em> = <em>beekeeping</em>, <em>run</em> = <em>ran</em>.
          </li>
          <li>The first guess that <em>is</em> in the article is final, so make it count!</li>
        </ul>
        <p className="muted">
          <strong>Daily</strong>: a new article every day at midnight. <strong>Endless</strong>: random
          articles, as many rounds as you like. You can skip an article until a pickaxe breaks, and skips don't affect
          your stats.
        </p>
      </div>
    </Modal>
  );
}
