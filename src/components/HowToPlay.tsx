import { Modal } from './Modal';

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How to play" onClose={onClose}>
      <div className="rules">
        <p>
          Each day you get the title of one Wikipedia article. Guess a <strong>single word</strong> that you think
          first appears <strong>as far down the article as possible</strong>.
        </p>
        <ul>
          <li>Only the word's <em>first</em> appearance counts.</li>
          <li>If the word isn't in the article at all, you score 0%.</li>
          <li>Citations, reference lists, tables, captions, infoboxes, and end sections (See also, References, External links…) don't count.</li>
          <li>Matching ignores capitalization and accents, but plurals and other forms are different words.</li>
          <li>You only get one guess — make it count!</li>
        </ul>
        <p className="muted">A new article every day at midnight.</p>
      </div>
    </Modal>
  );
}
