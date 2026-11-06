import { WORD_RE, wordKeys } from './scoring';

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
  /** Each word's family keys (see wordKeys), in reading order; position is the score basis. */
  keys: string[][];
  /** Words as written in the article, parallel to `keys`. */
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

/** URLs and bare domains (beekeeping.com): shown in the reveal, but never counted as words. */
const URL_RE = /(?:https?:\/\/|www\.)\S+|[\p{L}\d-]+(?:\.[\p{L}\d-]+)*\.(?:com|org|net|edu|gov|int|info|io|co|uk)\b(?:\/\S*)?/iu;
const TOKEN_RE = new RegExp(`(${URL_RE.source})|${WORD_RE.source}`, 'giu');

const HEADING_LEVEL: Partial<Record<BlockType, number>> = { h2: 2, h3: 3, h4: 4 };

interface RawBlock {
  type: BlockType;
  text: string;
}

/** Drop headings whose section ended up empty (e.g. "Gallery" once the images are removed). */
function dropEmptySections(raw: RawBlock[]): RawBlock[] {
  return raw.filter((block, i) => {
    const level = HEADING_LEVEL[block.type];
    if (level === undefined) return true;
    for (const next of raw.slice(i + 1)) {
      const nextLevel = HEADING_LEVEL[next.type];
      if (nextLevel === undefined) return true; // found content
      if (nextLevel <= level) return false; // section closed with nothing in it
    }
    return false;
  });
}

export function extractArticle(html: string): Article {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.querySelector('.mw-parser-output') ?? doc.body;
  root.querySelectorAll(REMOVE_SELECTORS.join(',')).forEach((el) => el.remove());

  const raw: RawBlock[] = [];
  let stopped = false;

  function addBlock(type: BlockType, rawText: string) {
    const text = cleanText(rawText);
    if (text) raw.push({ type, text });
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

  const blocks: Block[] = [];
  const keys: string[][] = [];
  const originals: string[] = [];
  for (const { type, text } of dropEmptySections(raw)) {
    const segments: Segment[] = [];
    let last = 0;
    for (const match of text.matchAll(TOKEN_RE)) {
      if (match[1]) continue; // URL: left inside the surrounding plain-text segment
      const start = match.index!;
      if (start > last) segments.push({ text: text.slice(last, start) });
      segments.push({ text: match[0], wordIndex: keys.length });
      keys.push(wordKeys(match[0]));
      originals.push(match[0]);
      last = start + match[0].length;
    }
    if (last < text.length) segments.push({ text: text.slice(last) });
    blocks.push({ type, segments });
  }
  return { blocks, keys, originals };
}
