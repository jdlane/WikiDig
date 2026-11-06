/**
 * Builds public/pool.json, the ordered list of daily puzzles, from Wikipedia's level-4 vital articles.
 *
 *   npm run build:pool                       full run (first run ~1 hour; cached after that)
 *   npm run build:pool -- --limit 50 --out scripts/.cache/sample.json   quick sample
 *   npm run build:pool -- --refresh          ignore cached word counts and revisions
 *
 * Set WIKI_CONTACT (an email or URL) so Wikimedia can reach you about the traffic:
 * https://meta.wikimedia.org/wiki/User-Agent_policy
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { getPuzzleNumber, toDateKey } from '../src/lib/daily';
import { countWords } from '../src/lib/extractText';
import type { PoolEntry, PoolFile } from '../src/lib/pool';
import * as config from './pool-config';
import {
  filterReason,
  isBlockedByCategory,
  mapLimit,
  mergePool,
  seededShuffle,
  type Candidate,
  type FilterReason,
} from './poolLib';

globalThis.DOMParser = new JSDOM('').window.DOMParser;

const API = 'https://en.wikipedia.org/w/api.php';
const CONTACT = process.env.WIKI_CONTACT;
const USER_AGENT = `WikiDigPoolBuilder/0.1 (daily word game${CONTACT ? `; ${CONTACT}` : ''})`;
/** Article fetches in flight at once, and the minimum gap between any two requests. */
const CONCURRENCY = 2;
const MIN_INTERVAL_MS = 250;
const CACHE_DIR = path.resolve('scripts/.cache/articles');

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const LIMIT = option('limit') ? Number(option('limit')) : Infinity;
const OUT = path.resolve(option('out') ?? 'public/pool.json');
const REFRESH = flag('refresh');

type Params = Record<string, string>;
// The API's JSON is loosely typed; each step picks out what it needs.
type Json = any;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Space requests out globally, across concurrent workers. */
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  await sleep(wait);
}

/** One API call, retrying on rate limits (which may come back as plain text), lag and server errors. */
async function api(params: Params): Promise<Json> {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`;
  for (let attempt = 1; ; attempt++) {
    await throttle();
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    const body = await res.text();
    let data: Json = null;
    try {
      data = JSON.parse(body);
    } catch {
      /* rate-limit and error pages aren't JSON */
    }
    const retryable = res.status === 429 || res.status >= 500 || !data || data.error?.code === 'maxlag';
    if (!retryable) {
      if (!res.ok || data.error) throw new Error(`API error: ${data.error?.info ?? res.status} (${url})`);
      return data;
    }
    if (attempt === 6) throw new Error(`Gave up after ${attempt} attempts (${res.status}: ${body.slice(0, 80)})`);
    const wait = Number(res.headers.get('retry-after') ?? 0) * 1000 || 2 ** attempt * 2000;
    console.warn(`  …rate limited or unavailable (${res.status}); retrying in ${wait / 1000}s`);
    nextSlot = Math.max(nextSlot, Date.now() + wait); // back off every worker, not just this one
    await sleep(wait);
  }
}

/** Follow `continue` tokens; yields each response. */
async function* queryAll(params: Params): AsyncGenerator<Json> {
  let cont: Params = {};
  do {
    const data = await api({ action: 'query', ...params, ...cont });
    yield data;
    cont = data.continue ?? null;
  } while (cont);
}

async function categoryMembers(category: string, extra: Params): Promise<string[]> {
  const titles: string[] = [];
  for await (const data of queryAll({ list: 'categorymembers', cmtitle: category, cmlimit: 'max', ...extra })) {
    for (const m of data.query.categorymembers) titles.push(m.title);
  }
  return titles;
}

/** Step 1–2: every level-4 vital article, with its topic. */
async function gatherTitles(): Promise<Map<string, string>> {
  const topics = await categoryMembers(config.SOURCE_CATEGORY, { cmtype: 'subcat' });
  console.log(`Found ${topics.length} topic categories.`);
  const topicOf = new Map<string, string>();
  for (const category of topics) {
    const topic = category.replace(/^.* vital articles in /, '');
    if (config.EXCLUDED_TOPICS.has(topic)) {
      console.log(`  ${topic}: skipped (excluded topic)`);
      continue;
    }
    const talkPages = await categoryMembers(category, { cmnamespace: '1', cmtype: 'page' });
    for (const talk of talkPages) {
      const title = talk.replace(/^Talk:/, '');
      if (!topicOf.has(title)) topicOf.set(title, topic);
    }
    console.log(`  ${topic}: ${talkPages.length}`);
  }
  return topicOf;
}

/**
 * Step 3: size and disambiguation flag, 50 pages per request. (Categories come later with
 * the article text: asking for them here multiplies the request count.)
 */
async function gatherMetadata(topicOf: Map<string, string>): Promise<Candidate[]> {
  const titles = [...topicOf.keys()];
  const candidates: Candidate[] = [];
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const data = await api({
      action: 'query',
      titles: batch.join('|'),
      prop: 'info|pageprops',
      ppprop: 'disambiguation',
      redirects: '1',
    });
    // Map normalized/redirected titles back to the talk-page title, to recover the topic.
    const original = new Map<string, string>(batch.map((t) => [t, t]));
    for (const step of [...(data.query.normalized ?? []), ...(data.query.redirects ?? [])]) {
      original.set(step.to, original.get(step.from) ?? step.from);
    }
    for (const page of data.query.pages ?? []) {
      if (page.missing || page.ns !== 0) continue;
      candidates.push({
        title: page.title,
        topic: topicOf.get(original.get(page.title) ?? page.title) ?? 'Unknown',
        length: page.length ?? 0,
        disambiguation: page.pageprops?.disambiguation !== undefined,
      });
    }
    if ((i / 50) % 20 === 19) console.log(`  metadata ${Math.min(i + 50, titles.length)}/${titles.length}`);
  }
  return candidates;
}

interface CachedArticle {
  title: string;
  revisionId: number;
  words: number;
  /** Visible (non-maintenance) categories, "Category:…". */
  categories: string[];
}

function cachePath(title: string): string {
  // encodeURIComponent leaves `*`, which Windows doesn't allow in file names.
  return path.join(CACHE_DIR, `${encodeURIComponent(title).replace(/\*/g, '%2A')}.json`);
}

/** Step 5: latest revision, scorable word count and categories, cached on disk. */
async function measure(title: string): Promise<CachedArticle> {
  const file = cachePath(title);
  if (!REFRESH && existsSync(file)) {
    const cached = JSON.parse(await readFile(file, 'utf8')) as CachedArticle;
    if (cached.categories) return cached;
  }
  const data = await api({
    action: 'parse',
    page: title,
    prop: 'text|revid|categories',
    redirects: '1',
    disableeditsection: '1',
    disabletoc: '1',
  });
  const result: CachedArticle = {
    title,
    revisionId: data.parse.revid,
    words: countWords(data.parse.text),
    categories: (data.parse.categories as { category: string; hidden?: boolean }[])
      .filter((c) => !c.hidden)
      .map((c) => `Category:${c.category.replace(/_/g, ' ')}`),
  };
  await writeFile(file, JSON.stringify(result));
  return result;
}

async function readExisting(): Promise<PoolEntry[]> {
  if (!existsSync(OUT)) return [];
  return (JSON.parse(await readFile(OUT, 'utf8')) as PoolFile).entries;
}

/** One entry per line, so diffs of the schedule stay readable. */
function serialize(file: PoolFile): string {
  const lines = file.entries.map((e) => `    ${JSON.stringify(e)}`).join(',\n');
  return `{\n  "generatedAt": ${JSON.stringify(file.generatedAt)},\n  "entries": [\n${lines}\n  ]\n}\n`;
}

async function main() {
  if (!CONTACT) console.warn('Tip: set WIKI_CONTACT=<email or URL> to identify this script to Wikimedia.\n');
  await mkdir(CACHE_DIR, { recursive: true });

  const topicOf = await gatherTitles();
  console.log(`${topicOf.size} vital articles.`);
  const sample = Number.isFinite(LIMIT)
    ? new Map(seededShuffle([...topicOf], config.SEED).slice(0, LIMIT))
    : topicOf;
  console.log(`Fetching metadata for ${sample.size}…`);
  const candidates = await gatherMetadata(sample);

  type Reason = FilterReason | 'blocked category' | 'too few words';
  const rejected = new Map<Reason, string[]>();
  const reject = (reason: Reason, title: string) => rejected.set(reason, [...(rejected.get(reason) ?? []), title]);

  const filterConfig = {
    minBytes: config.MIN_BYTES,
    nonArticleTitles: config.NON_ARTICLE_TITLES,
    blockedTitlePatterns: config.BLOCKED_TITLE_PATTERNS,
    blockedCategoryPatterns: config.BLOCKED_CATEGORY_PATTERNS,
    excludeTitles: config.EXCLUDE_TITLES,
  };
  const passing = candidates.filter((c) => {
    const reason = filterReason(c, filterConfig);
    if (reason) reject(reason, c.title);
    return !reason;
  });

  console.log(`${passing.length} candidates pass the quick filters. Measuring prose…`);
  let done = 0;
  const measured = await mapLimit(passing, CONCURRENCY, async (c) => {
    const m = await measure(c.title).catch((err: unknown) => {
      console.warn(`  skipped ${c.title}: ${err instanceof Error ? err.message : err}`);
      return null;
    });
    if (++done % 100 === 0) console.log(`  ${done}/${passing.length}`);
    return m && { ...m, topic: c.topic };
  });

  const fresh: PoolEntry[] = [];
  for (const m of measured) {
    if (!m) continue;
    if (isBlockedByCategory(m.categories, filterConfig)) reject('blocked category', m.title);
    else if (m.words < config.MIN_WORDS) reject('too few words', m.title);
    else fresh.push({ title: m.title, revisionId: m.revisionId, topic: m.topic, words: m.words });
  }
  fresh.sort((a, b) => a.title.localeCompare(b.title)); // stable input → reproducible shuffle

  const existing = await readExisting();
  const lastPlayedIndex = getPuzzleNumber(toDateKey(new Date())) - 1;
  const entries = mergePool(existing, fresh, lastPlayedIndex, config.SEED);

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, serialize({ generatedAt: new Date().toISOString(), entries }));

  // Summary
  console.log('\nRejected:');
  for (const [reason, titles] of rejected) {
    console.log(`  ${reason}: ${titles.length}  (e.g. ${titles.slice(0, 5).join('; ')})`);
  }
  const perTopic = new Map<string, number>();
  for (const e of entries) perTopic.set(e.topic, (perTopic.get(e.topic) ?? 0) + 1);
  console.log('\nPer topic:');
  for (const [topic, n] of [...perTopic].sort((a, b) => b[1] - a[1])) console.log(`  ${topic}: ${n}`);
  const kept = Math.max(0, Math.min(existing.length, lastPlayedIndex + 1));
  console.log(
    `\nWrote ${entries.length} puzzles to ${path.relative(process.cwd(), OUT)} ` +
      `(${kept} already-played days kept; ~${(entries.length / 365).toFixed(1)} years of puzzles).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
