import { describe, expect, it } from 'vitest';
import { countWords, extractArticle, firstSentenceOf } from './extractText';
import { loadWordForms } from './wordForms';

await loadWordForms();

const FIXTURE = `
<div class="mw-parser-output">
  <div class="shortdescription">Short description here</div>
  <div class="hatnote">For other uses, see Foo.</div>
  <table class="infobox"><tr><td>Infobox kingdom</td></tr></table>
  <p>The <b>octopus</b> is a mollusc.<sup class="reference">[1]</sup> It has eight arms.</p>
  <figure><figcaption>A caption word</figcaption></figure>
  <div class="mw-heading mw-heading2"><h2 id="Anatomy">Anatomy</h2></div>
  <p>Octopuses have three hearts.<sup class="noprint Inline-Template">[citation needed]</sup></p>
  <ul><li>Ink sac<ul><li>Nested item</li></ul></li><li>Beak</li></ul>
  <div class="mw-heading mw-heading2"><h2 id="See_also">See also</h2></div>
  <ul><li>Squid</li></ul>
  <div class="mw-heading mw-heading2"><h2 id="References">References</h2></div>
  <div class="reflist"><ol class="references"><li>Smith, cited source</li></ol></div>
</div>`;

describe('extractArticle', () => {
  const article = extractArticle(FIXTURE);

  it('keeps prose, headings and list items in order', () => {
    expect(article.originals).toEqual([
      'The', 'octopus', 'is', 'a', 'mollusc', 'It', 'has', 'eight', 'arms',
      'Anatomy',
      'Octopuses', 'have', 'three', 'hearts',
      'Ink', 'sac', 'Nested', 'item', 'Beak',
    ]);
  });

  it('stores family keys, so word forms share a key', () => {
    expect(article.keys).toHaveLength(article.originals.length);
    expect(article.keys[10]).toContain('octopus'); // Octopuses
    expect(article.keys[1]).toContain('octopus');
  });

  it('drops headings of empty sections and does not count web addresses', () => {
    const html = `<div class="mw-parser-output">
      <p>Founded beekeeping.com and www.bees.org/hive in 1996.</p>
      <div class="mw-heading mw-heading2"><h2>History</h2></div>
      <div class="mw-heading mw-heading3"><h3>Empty subsection</h3></div>
      <p>Bees.</p>
      <div class="mw-heading mw-heading2"><h2>Gallery</h2></div>
      <ul class="gallery"><li>Image</li></ul>
    </div>`;
    const a = extractArticle(html);
    expect(a.originals).toEqual(['Founded', 'and', 'in', 'History', 'Empty', 'subsection', 'Bees']);
    expect(a.blocks[0].segments.map((s) => s.text).join('')).toBe(
      'Founded beekeeping.com and www.bees.org/hive in 1996.',
    );
  });

  it('excludes citations, infoboxes, captions, hatnotes and end sections', () => {
    const lower = article.originals.map((w) => w.toLowerCase());
    for (const w of ['citation', 'needed', 'kingdom', 'caption', 'uses', 'squid', 'smith', 'short']) {
      expect(lower).not.toContain(w);
    }
  });

  it('maps segments back to word indexes', () => {
    const first = article.blocks[0];
    const words = first.segments.filter((s) => s.wordIndex !== undefined);
    expect(words[1]).toEqual({ text: 'octopus', wordIndex: 1 });
    expect(first.segments.map((s) => s.text).join('')).toBe('The octopus is a mollusc. It has eight arms.');
  });

  it('counts words the same way without building the article', () => {
    expect(countWords(FIXTURE)).toBe(article.originals.length);
  });

  it('labels block types', () => {
    expect(article.blocks.map((b) => b.type)).toEqual(['p', 'h2', 'p', 'li', 'li', 'li']);
  });

  it('exposes the lead paragraph\'s first sentence', () => {
    expect(article.firstSentence).toBe('The octopus is a mollusc.');
  });

  it('has no first sentence without a paragraph', () => {
    expect(extractArticle('<div class="mw-parser-output"><ul><li>Only a list</li></ul></div>').firstSentence).toBeNull();
  });
});

describe('firstSentenceOf', () => {
  it('stops at the first sentence end', () => {
    expect(firstSentenceOf('Rome is a city. It is in Italy.')).toBe('Rome is a city.');
    expect(firstSentenceOf('Is Rome a city? It is.')).toBe('Is Rome a city?');
  });

  it('returns a paragraph with no sentence end whole', () => {
    expect(firstSentenceOf('Mercury may refer to:')).toBe('Mercury may refer to:');
  });

  it.each([
    'St. Louis is an independent city in the U.S. state of Missouri.',
    'Martin Luther King Jr. was an American activist.',
    'Washington, D.C., is the capital of the United States.',
    'J. R. R. Tolkien was an English writer.',
    'Socrates (c. 470 – 399 BC. Athens) was a Greek philosopher.',
    'Pi is approximately equal to 3.14159, a constant.',
    'Yahoo! is an American web portal.',
    '"Help!" is a song by the Beatles.',
  ])('does not stop early in: %s', (sentence) => {
    expect(firstSentenceOf(`${sentence} Another sentence follows.`)).toBe(sentence);
  });

  it('keeps a closing quote with its sentence', () => {
    expect(firstSentenceOf('He called it "the end." Then he left.')).toBe('He called it "the end."');
  });

  it('tidies parentheses left by removed pronunciation guides', () => {
    expect(firstSentenceOf('Yahoo () is a portal.')).toBe('Yahoo is a portal.');
    expect(firstSentenceOf('An octopus is of the order Octopoda (, ).')).toBe('An octopus is of the order Octopoda.');
    expect(firstSentenceOf('Socrates (; Ancient Greek: Σωκράτης) was a philosopher.')).toBe(
      'Socrates (Ancient Greek: Σωκράτης) was a philosopher.',
    );
  });
});
