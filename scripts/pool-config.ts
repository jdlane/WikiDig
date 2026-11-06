/** Settings for `npm run build:pool`. Edit and rerun; already-played days never change. */

// Shared with the game's endless mode.
export { BLOCKED_TITLE_PATTERNS, MIN_WORDS, NON_ARTICLE_TITLES } from '../src/data/articleRules';

/** Parent category whose subcategories list the level-4 vital articles (by talk page). */
export const SOURCE_CATEGORY = 'Category:Wikipedia level-4 vital articles by topic';

/** Cheap prefilter on page size in bytes of wikitext, before fetching anything. */
export const MIN_BYTES = 20_000;

/** Seed for shuffling newly added articles into the schedule. */
export const SEED = 20261101;

/**
 * Sensitive topics, matched against the article's visible categories. Narrower than the
 * title patterns, since biographies carry categories like "1890 suicides".
 */
export const BLOCKED_CATEGORY_PATTERNS: RegExp[] = [
  /^Category:(Human )?sexuality\b/i,
  /^Category:Sexual (acts|health|abuse|violence)/i,
  /^Category:Pornography/i,
  /^Category:Genocides?\b/i,
  /^Category:Terrorism\b/i,
  /^Category:Psychoactive drugs\b/i,
];

/** Manual vetoes (exact titles). */
export const EXCLUDE_TITLES = new Set<string>([]);
