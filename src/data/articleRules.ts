/** What makes an article playable. Shared by the game (endless mode) and scripts/build-pool.ts. */

/** Minimum scorable words (by the game's own text rules). */
export const MIN_WORDS = 1_500;

/** Pages that are navigation rather than prose. */
export const NON_ARTICLE_TITLES = /^(List|Lists|Outline|Index|Timeline|Glossary) of /i;

/**
 * Sensitive topics, matched against the title. Broad on purpose: a false positive just
 * skips an article.
 */
export const BLOCKED_TITLE_PATTERNS: RegExp[] = [
  /\bsex(ual|uality)?\b/i,
  /\bporn/i,
  /\b(rape|incest|paedophil|pedophil|prostitut)/i,
  /\b(genocide|holocaust|massacre|ethnic cleansing)\b/i,
  /\b(terroris[mt]|suicide|torture|lynching)\b/i,
  /\b(slavery|slave trade)\b/i,
  /\b(cocaine|heroin|methamphetamine|cannabis|opium|drug abuse|addiction)\b/i,
  /\b(abortion|euthanasia|capital punishment)\b/i,
];

/** Title-only check: true if the title looks like a playable, non-sensitive article. */
export function isPlayableTitle(title: string): boolean {
  return !NON_ARTICLE_TITLES.test(title) && !BLOCKED_TITLE_PATTERNS.some((p) => p.test(title));
}
