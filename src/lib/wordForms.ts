/**
 * Word families, backed by WordNet.
 *
 * A word maps to a small set of keys; two words are "the same word" if their key sets overlap.
 *  - Inflections come from WordNet's lemmatizer (Morphy): plurals, tenses and irregular forms
 *    (octopuses → octopus, ran → run, mice → mouse). Every reading is kept, so "saw" covers
 *    both the noun and "see".
 *  - A few derivational rules join related words, each checked against WordNet so they only
 *    fire when the result is a real word of the right kind:
 *      agent nouns    beekeeper → beekeeping, farmer → farm, writer → write   (person nouns only;
 *                     flower, tower and butter are left alone)
 *      -ation         pollination → pollinate, formation → form
 *      -ction/-ption  protection → protect, adoption → adopt
 */
type WordNet = (typeof import('./wordNetData'))['default'];

let wn: WordNet | null = null;
let loading: Promise<void> | null = null;

/** Load the WordNet data. Must resolve before wordKeys() is called. */
export function loadWordForms(): Promise<void> {
  loading ??= import('./wordNetData').then((m) => {
    wn = m.default;
  });
  return loading;
}

function data(): WordNet {
  if (!wn) throw new Error('Word forms not loaded: await loadWordForms() first.');
  return wn;
}

// Indexes into WordNet's lexicographer categories (wink-lexicon/src/wn-senses.js).
const NOUN_PERSON = 18;
const VERB_FIRST = 29;
const VERB_LAST = 43;

function sensesOf(word: string): number[] {
  const { words, senses } = data();
  const i = words[word];
  return i === undefined ? [] : senses[i];
}

const isWord = (w: string) => sensesOf(w).length > 0;
const isVerb = (w: string) => sensesOf(w).some((s) => s >= VERB_FIRST && s <= VERB_LAST);
const isPerson = (w: string) => sensesOf(w).includes(NOUN_PERSON);

/**
 * "farmer" → "farm", "writer" → "write", "beekeeper" → "beekeeping", "runner" → "running".
 * Doubled consonants are deliberately not undone: "letter" has a WordNet person sense
 * (one who lets property) and would otherwise join "let".
 */
function agentBase(word: string): string | null {
  if (!word.endsWith('er') || !isPerson(word)) return null;
  const stem = word.slice(0, -2);
  for (const c of [stem, `${stem}e`]) if (isVerb(c)) return c;
  // No verb (there's no "to beekeep"): join with the activity noun instead.
  return isWord(`${stem}ing`) ? `${stem}ing` : null;
}

/** "pollination" → "pollinate", "formation" → "form", "protection" → "protect". */
function actionBase(word: string): string | null {
  if (word.endsWith('ation')) {
    const stem = word.slice(0, -5);
    if (stem.length < 3) return null; // nation, station
    for (const c of [`${stem}ate`, `${stem}e`, stem]) if (isVerb(c)) return c;
    return null;
  }
  if (word.endsWith('ion')) {
    const stem = word.slice(0, -3);
    // Only -ction/-ption (protect, elect, adopt): other endings misfire (question → quest).
    return /(ct|pt)$/.test(stem) && isVerb(stem) ? stem : null;
  }
  return null;
}

const cache = new Map<string, string[]>();

/** Keys for a normalized (lowercase, accent-free) word. */
export function wordFamilies(normalized: string): string[] {
  const cached = cache.get(normalized);
  if (cached) return cached;
  const { lemmatizer } = data();
  const base = normalized.replace(/'s$/, '');
  const keys = new Set([base, lemmatizer.noun(base), lemmatizer.verb(base), lemmatizer.adjective(base)]);
  for (const k of [...keys]) {
    const derived = agentBase(k) ?? actionBase(k);
    if (derived) keys.add(derived);
  }
  const result = [...keys];
  cache.set(normalized, result);
  return result;
}
