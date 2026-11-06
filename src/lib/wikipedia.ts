const API = 'https://en.wikipedia.org/w/api.php';

export interface ArticleHtml {
  title: string;
  revisionId: number;
  html: string;
}

interface ParseResponse {
  parse?: { title: string; revid: number; text: string };
  error?: { info: string };
}

/** GET the MediaWiki Action API from the browser (CORS-enabled with origin=*). */
export async function wikiApi<T>(params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params });
  const res = await fetch(`${API}?${query}`);
  if (res.status === 429) throw new Error('Wikipedia is rate-limiting requests — try again in a minute');
  if (!res.ok) throw new Error(`Wikipedia request failed (${res.status})`);
  return (await res.json()) as T;
}

/** Recent articles, by title and by revision, so re-requests (e.g. endless mode's check, then play) are free. */
const memory = new Map<string, ArticleHtml>();
const MEMORY_LIMIT = 6;

function remember(article: ArticleHtml, requestedTitle?: string) {
  for (const key of [`rev:${article.revisionId}`, requestedTitle && `title:${requestedTitle}`]) {
    if (!key) continue;
    memory.delete(key);
    memory.set(key, article);
  }
  while (memory.size > MEMORY_LIMIT * 2) memory.delete(memory.keys().next().value!);
}

/** Fetch rendered article HTML via the Parse API: a pinned revision, or the latest one. */
export async function fetchArticleHtml(title: string, revisionId?: number): Promise<ArticleHtml> {
  const key = revisionId ? `rev:${revisionId}` : `title:${title}`;
  const inMemory = memory.get(key);
  if (inMemory) return inMemory;
  const storageKey = `wikidepth:html:${key}`;
  try {
    const cached = sessionStorage.getItem(storageKey);
    if (cached) return JSON.parse(cached) as ArticleHtml;
  } catch {
    /* storage unavailable */
  }

  const params: Record<string, string> = {
    action: 'parse',
    prop: 'text|revid',
    redirects: '1',
    disableeditsection: '1',
    disabletoc: '1',
  };
  if (revisionId) params.oldid = String(revisionId);
  else params.page = title;

  const data = await wikiApi<ParseResponse>(params);
  if (!data.parse) throw new Error(data.error?.info ?? 'Article not found');

  const article: ArticleHtml = {
    title: data.parse.title,
    revisionId: data.parse.revid,
    html: data.parse.text,
  };
  remember(article, revisionId ? undefined : title);
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(article));
  } catch {
    /* quota exceeded or unavailable; caching is best-effort */
  }
  return article;
}

export function articleUrl(title: string, revisionId?: number): string {
  const base = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  return revisionId ? `${base}?oldid=${revisionId}` : base;
}
