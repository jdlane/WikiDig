import type { PoolEntry } from '../src/lib/pool';

export interface Candidate {
  title: string;
  topic: string;
  /** Wikitext size in bytes. */
  length: number;
  disambiguation: boolean;
}

export interface FilterConfig {
  minBytes: number;
  nonArticleTitles: RegExp;
  blockedTitlePatterns: RegExp[];
  blockedCategoryPatterns: RegExp[];
  excludeTitles: Set<string>;
}

export type FilterReason = 'disambiguation' | 'not an article' | 'too short' | 'blocked topic' | 'excluded';

/** Why a candidate is rejected before fetching its text, or null if it passes. */
export function filterReason(c: Candidate, config: FilterConfig): FilterReason | null {
  if (config.excludeTitles.has(c.title)) return 'excluded';
  if (c.disambiguation) return 'disambiguation';
  if (config.nonArticleTitles.test(c.title)) return 'not an article';
  if (config.blockedTitlePatterns.some((p) => p.test(c.title))) return 'blocked topic';
  if (c.length < config.minBytes) return 'too short';
  return null;
}

/** Category check, applied once the article (and so its categories) has been fetched. */
export function isBlockedByCategory(categories: string[], config: FilterConfig): boolean {
  return categories.some((cat) => config.blockedCategoryPatterns.some((p) => p.test(cat)));
}

/** Small, fast seeded PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher–Yates shuffle; doesn't modify the input. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Append-only schedule update.
 *  - Entries for days up to `lastPlayedIndex` (today) are kept exactly, whatever the filters say now.
 *  - Later entries are kept, in order, while they're still in `fresh` (still pass all filters).
 *  - Newly found articles are shuffled and appended.
 * Existing entries keep their pinned revision.
 */
export function mergePool(
  existing: PoolEntry[],
  fresh: PoolEntry[],
  lastPlayedIndex: number,
  seed: number,
): PoolEntry[] {
  const freshTitles = new Set(fresh.map((e) => e.title));
  const past = existing.slice(0, lastPlayedIndex + 1);
  const future = existing.slice(lastPlayedIndex + 1).filter((e) => freshTitles.has(e.title));
  const scheduled = new Set([...past, ...future].map((e) => e.title));
  const added = fresh.filter((e) => !scheduled.has(e.title));
  // Seed by schedule length so each run's additions shuffle differently but reproducibly.
  return [...past, ...future, ...seededShuffle(added, seed + existing.length)];
}

/**
 * Which titles to process (title → topic). Already-scheduled articles always come first
 * (with their stored topic), so a sampled run never drops them. The rest is a seeded random
 * sample up to `limit`. Titles are sorted before shuffling, so the order the API lists them
 * in doesn't matter.
 */
export function chooseSample(
  all: Map<string, string>,
  existing: PoolEntry[],
  limit: number,
  seed: number,
): Map<string, string> {
  const sample = new Map(existing.map((e) => [e.title, all.get(e.title) ?? e.topic]));
  const others = [...all].filter(([title]) => !sample.has(title)).sort(([a], [b]) => a.localeCompare(b));
  for (const [title, topic] of seededShuffle(others, seed)) {
    if (sample.size >= limit) break;
    sample.set(title, topic);
  }
  return sample;
}

/** Run `fn` over `items` with at most `limit` in flight. Results keep input order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
