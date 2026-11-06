import { MIN_WORDS, isPlayableTitle } from '../data/articleRules';
import type { Puzzle } from '../data/puzzles';
import { countWords } from './extractText';
import { fetchArticleHtml, wikiApi } from './wikipedia';

/**
 * Level-4 vital articles by quality class (the same source as randomincategory.toolforge.org,
 * minus List- and Stub-Class). Members are talk pages: "Talk:Octopus".
 */
export const RANDOM_CATEGORIES = ['FA', 'FL', 'GA', 'A', 'B', 'C', 'Start'].map(
  (cls) => `Category:${cls}-Class level-4 vital articles`,
);

const CHUNK = 500; // the API's max list size for anonymous clients
const MAX_ATTEMPTS = 8;

/** Choose a uniformly random member across categories: which category, and the offset within it. */
export function pickIndex(sizes: number[], r: number): { category: number; offset: number } {
  const total = sizes.reduce((a, b) => a + b, 0);
  if (total === 0) throw new Error('No articles to choose from');
  let k = Math.min(Math.floor(r * total), total - 1);
  for (let category = 0; category < sizes.length; category++) {
    if (k < sizes[category]) return { category, offset: k };
    k -= sizes[category];
  }
  throw new Error('unreachable');
}

interface CategoryInfoResponse {
  query: { pages: { title: string; categoryinfo?: { pages: number } }[] };
}

interface MembersResponse {
  query: { categorymembers: { title: string }[] };
  continue?: Record<string, string>;
}

let sizes: Promise<number[]> | null = null;

function categorySizes(): Promise<number[]> {
  sizes ??= wikiApi<CategoryInfoResponse>({
    action: 'query',
    prop: 'categoryinfo',
    titles: RANDOM_CATEGORIES.join('|'),
  })
    .then((data) => {
      const byTitle = new Map(data.query.pages.map((p) => [p.title, p.categoryinfo?.pages ?? 0]));
      return RANDOM_CATEGORIES.map((c) => byTitle.get(c) ?? 0);
    })
    .catch((err) => {
      sizes = null; // retry next time
      throw err;
    });
  return sizes;
}

/** Member lists fetched so far, per category; extended page by page as deeper offsets are needed. */
const loaded = new Map<string, { titles: string[]; next: Record<string, string> | null }>();

async function memberAt(category: string, offset: number): Promise<string | null> {
  let entry = loaded.get(category);
  if (!entry) loaded.set(category, (entry = { titles: [], next: {} }));
  while (entry.titles.length <= offset && entry.next) {
    const data = await wikiApi<MembersResponse>({
      action: 'query',
      list: 'categorymembers',
      cmtitle: category,
      cmnamespace: '1',
      cmprop: 'title',
      cmlimit: String(CHUNK),
      ...entry.next,
    });
    entry.titles.push(...data.query.categorymembers.map((m) => m.title));
    entry.next = data.continue ?? null;
  }
  // Category counts can run slightly ahead of the real list; fall back to its last member.
  return entry.titles[Math.min(offset, entry.titles.length - 1)] ?? null;
}

/**
 * A random playable vital article, pinned to its current revision. Skips lists, sensitive
 * titles and articles under MIN_WORDS, trying again up to MAX_ATTEMPTS times.
 */
export async function pickRandomPuzzle(random: () => number = Math.random): Promise<Puzzle> {
  const counts = await categorySizes();
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { category, offset } = pickIndex(counts, random());
    const talk = await memberAt(RANDOM_CATEGORIES[category], offset);
    const title = talk?.replace(/^Talk:/, '');
    if (!title || !isPlayableTitle(title)) continue;
    // Fetched once here; the game's own fetch then hits fetchArticleHtml's memory cache.
    const article = await fetchArticleHtml(title);
    if (countWords(article.html) >= MIN_WORDS) return { title: article.title, revisionId: article.revisionId };
  }
  throw new Error("Couldn't find a playable article — try again");
}
