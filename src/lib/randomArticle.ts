import { MIN_WORDS, isPlayableTitle } from '../data/articleRules';
import type { Puzzle } from '../data/puzzles';
import { countWords } from './extractText';
import { fetchArticleHtml } from './wikipedia';

/** Shape of public/endless-pool.json, written by scripts/build-endless-pool.ts. */
export interface EndlessPoolFile {
  generatedAt: string;
  /** Level-4 and level-5 vital articles (FA…Start-Class) with playable titles. */
  titles: string[];
}

/** Draws per pick; draws of already-seen titles are free (nothing is fetched), so this is generous. */
const MAX_ATTEMPTS = 50;
/** Articles fetched per pick, for titles that turn out too short. */
const MAX_FETCHES = 8;
/** Once this share of the pool has been seen, repeats are allowed again. */
const SATURATION = 0.9;

let titles: Promise<string[]> | null = null;

/** The endless title list, fetched once. */
export function loadEndlessTitles(): Promise<string[]> {
  titles ??= fetch(`${import.meta.env.BASE_URL}endless-pool.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`endless-pool.json: ${res.status}`);
      return res.json() as Promise<EndlessPoolFile>;
    })
    .then((file) => {
      if (!file.titles.length) throw new Error('endless-pool.json is empty');
      return file.titles;
    })
    .catch((err) => {
      titles = null; // retry next time
      throw err;
    });
  return titles;
}

/** Choose a title uniformly at random, skipping `exclude` unless nearly all the pool is in it. */
export function pickTitle(pool: readonly string[], exclude: ReadonlySet<string>, random: () => number): string | null {
  const avoid = exclude.size < pool.length * SATURATION;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const title = pool[Math.min(Math.floor(random() * pool.length), pool.length - 1)];
    if (!avoid || !exclude.has(title)) return title;
  }
  return null;
}

/**
 * A random playable vital article that isn't in `exclude`, pinned to its current revision.
 * Skips articles under MIN_WORDS, trying again up to MAX_FETCHES times.
 */
export async function pickRandomPuzzle(
  random: () => number = Math.random,
  exclude: ReadonlySet<string> = new Set(),
): Promise<Puzzle> {
  const pool = await loadEndlessTitles();
  const tried = new Set(exclude);
  for (let fetches = 0; fetches < MAX_FETCHES; fetches++) {
    const title = pickTitle(pool, tried, random);
    if (!title) break;
    tried.add(title);
    if (!isPlayableTitle(title)) continue; // the rules may have tightened since the pool was built
    // Fetched once here; the game's own fetch then hits fetchArticleHtml's memory cache.
    const article = await fetchArticleHtml(title);
    // Redirects can land on a title that's already been played.
    if (article.title !== title && exclude.has(article.title)) continue;
    if (countWords(article.html) >= MIN_WORDS) return { title: article.title, revisionId: article.revisionId };
  }
  throw new Error("Couldn't find a playable article — try again");
}
