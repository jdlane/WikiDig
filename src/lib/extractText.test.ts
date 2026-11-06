import { describe, expect, it } from 'vitest';
import { extractArticle } from './extractText';

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
    expect(article.words).toEqual([
      'the', 'octopus', 'is', 'a', 'mollusc', 'it', 'has', 'eight', 'arms',
      'anatomy',
      'octopuses', 'have', 'three', 'hearts',
      'ink', 'sac', 'nested', 'item', 'beak',
    ]);
  });

  it('excludes citations, infoboxes, captions, hatnotes and end sections', () => {
    for (const w of ['citation', 'needed', 'kingdom', 'caption', 'uses', 'squid', 'smith', 'short']) {
      expect(article.words).not.toContain(w);
    }
  });

  it('maps segments back to word indexes', () => {
    const first = article.blocks[0];
    const words = first.segments.filter((s) => s.wordIndex !== undefined);
    expect(words[1]).toEqual({ text: 'octopus', wordIndex: 1 });
    expect(first.segments.map((s) => s.text).join('')).toBe('The octopus is a mollusc. It has eight arms.');
  });

  it('labels block types', () => {
    expect(article.blocks.map((b) => b.type)).toEqual(['p', 'h2', 'p', 'li', 'li', 'li']);
  });
});
