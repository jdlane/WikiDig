/**
 * Throttled Wikipedia API client for the build scripts.
 *
 * Set WIKI_CONTACT (an email or URL) so Wikimedia can reach you about the traffic:
 * https://meta.wikimedia.org/wiki/User-Agent_policy
 */

const API = 'https://en.wikipedia.org/w/api.php';
const CONTACT = process.env.WIKI_CONTACT;
const USER_AGENT = `WikiDigPoolBuilder/0.1 (daily word game${CONTACT ? `; ${CONTACT}` : ''})`;
// Identified clients (User-Agent with contact info) get 200 requests/min; stay under it.
// Without WIKI_CONTACT the limit is 10/min and the script spends most of its time waiting.
const MIN_INTERVAL_MS = 350;

/** Call at startup: without WIKI_CONTACT, Wikimedia rate-limits hard (10 requests/min). */
export function warnIfAnonymous(): void {
  if (!CONTACT) console.warn('Tip: set WIKI_CONTACT=<email or URL> to identify this script to Wikimedia.\n');
}

export type Params = Record<string, string>;
// The API's JSON is loosely typed; each caller picks out what it needs.
export type Json = any;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Space requests out globally, across concurrent workers. */
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  await sleep(wait);
}

/** One API call, retrying on rate limits (which may come back as plain text), lag and server errors. */
export async function api(params: Params): Promise<Json> {
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
export async function* queryAll(params: Params): AsyncGenerator<Json> {
  let cont: Params = {};
  do {
    const data = await api({ action: 'query', ...params, ...cont });
    yield data;
    cont = data.continue ?? null;
  } while (cont);
}

export async function categoryMembers(category: string, extra: Params): Promise<string[]> {
  const titles: string[] = [];
  for await (const data of queryAll({ list: 'categorymembers', cmtitle: category, cmlimit: 'max', ...extra })) {
    for (const m of data.query.categorymembers) titles.push(m.title);
  }
  return titles;
}
