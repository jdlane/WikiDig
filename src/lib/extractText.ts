import { WORD_RE, normalizeWord } from './scoring';

export type BlockType = 'h2' | 'h3' | 'h4' | 'p' | 'li';

/** A run of text; `wordIndex` is set when the run is a scorable word. */
export interface Segment {
  text: string;
  wordIndex?: number;
}

export interface Block {
  type: BlockType;
  segments: Segment[];
}

export interface Article {
  blocks: Block[];
  /** Normalized words in reading order; position in this array is the score basis. */
  words: string[];
  /** Words as written in the article, parallel to `words`. */
  originals: string[];
}

/** Elements whose text never counts: citations, boxes, captions, tables, maths, etc. */
const REMOVE_SELECTORS = [
  'sup.reference',
  'sup.noprint',
  '.Inline-Template',
  '.reflist',
  '.references',
  '.mw-references-wrap',
  '.navbox',
  '.navbox-styles',
  '.vertical-navbox',
  '.infobox',
  '.sidebar',
  '.hatnote',
  '.shortdescription',
  '.mw-editsection',
  '.metadata',
  '.ambox',
  '.toc',
  '#toc',
  '.thumb',
  'figure',
  '.gallery',
  '.mwe-math-element',
  '.IPA',
  '.rt-commentedText',
  '[title="English pronunciation respelling"]',
  '.mw-empty-elt',
  '.noprint',
  'table',
  'style',
  'link',
  'script',
];

/** Level-2 sections at which the article's prose is considered over. */
const END_SECTIONS = new Set([
  'references',
  'notes',
  'citations',
  'sources',
  'bibliography',
  'see also',
  'external links',
  'further reading',
  'footnotes',
  'notes and references',
  'works cited',
]);

const HEADING_TYPES: Record<string, BlockType> = { H2: 'h2', H3: 'h3', H4: 'h4', H5: 'h4', H6: 'h4' };

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function extractArticle(html: string): Article {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.querySelector('.mw-parser-output') ?? doc.body;
  root.querySelectorAll(REMOVE_SELECTORS.join(',')).forEach((el) => el.remove());

  const blocks: Block[] = [];
  const words: string[] = [];
  const originals: string[] = [];
  let stopped = false;

  function addBlock(type: BlockType, rawText: string) {
    const text = cleanText(rawText);
    if (!text) return;
    const segments: Segment[] = [];
    let last = 0;
    for (const match of text.matchAll(WORD_RE)) {
      const start = match.index!;
      if (start > last) segments.push({ text: text.slice(last, start) });
      segments.push({ text: match[0], wordIndex: words.length });
      words.push(normalizeWord(match[0]));
      originals.push(match[0]);
      last = start + match[0].length;
    }
    if (last < text.length) segments.push({ text: text.slice(last) });
    blocks.push({ type, segments });
  }

  function handleHeading(h: Element) {
    const type = HEADING_TYPES[h.tagName];
    const text = cleanText(h.textContent ?? '');
    if (type === 'h2' && END_SECTIONS.has(text.toLowerCase())) {
      stopped = true;
      return;
    }
    addBlock(type, text);
  }

  /** Text of a list item, excluding nested lists (which become their own items). */
  function ownText(li: Element): string {
    const clone = li.cloneNode(true) as Element;
    clone.querySelectorAll('ul, ol, dl').forEach((el) => el.remove());
    return clone.textContent ?? '';
  }

  function walkList(list: Element) {
    for (const item of Array.from(list.children)) {
      if (stopped) return;
      addBlock('li', ownText(item));
      item.querySelectorAll(':scope > ul, :scope > ol, :scope > dl').forEach(walkList);
    }
  }

  function walk(node: Element) {
    for (const el of Array.from(node.children)) {
      if (stopped) return;
      const tag = el.tagName;
      if (tag in HEADING_TYPES) {
        handleHeading(el);
      } else if (el.classList.contains('mw-heading')) {
        const h = el.querySelector('h2, h3, h4, h5, h6');
        if (h) handleHeading(h);
      } else if (tag === 'P') {
        addBlock('p', el.textContent ?? '');
      } else if (tag === 'UL' || tag === 'OL' || tag === 'DL') {
        walkList(el);
      } else {
        // Generic containers (div, section, blockquote…): descend.
        walk(el);
      }
    }
  }

  walk(root);
  return { blocks, words, originals };
}
