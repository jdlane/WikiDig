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

/** Fetch rendered article HTML via the MediaWiki Parse API (CORS-enabled with origin=*). */
export async function fetchArticleHtml(title: string, revisionId?: number): Promise<ArticleHtml> {
  const cacheKey = `wikidepth:html:${revisionId ?? title}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as ArticleHtml;
  } catch {
    /* storage unavailable */
  }

  const params = new URLSearchParams({
    action: 'parse',
    prop: 'text|revid',
    format: 'json',
    formatversion: '2',
    origin: '*',
    redirects: '1',
    disableeditsection: '1',
    disabletoc: '1',
  });
  if (revisionId) params.set('oldid', String(revisionId));
  else params.set('page', title);

  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`Wikipedia request failed (${res.status})`);
  const data = (await res.json()) as ParseResponse;
  if (!data.parse) throw new Error(data.error?.info ?? 'Article not found');

  const article: ArticleHtml = {
    title: data.parse.title,
    revisionId: data.parse.revid,
    html: data.parse.text,
  };
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(article));
  } catch {
    /* quota exceeded or unavailable; caching is best-effort */
  }
  return article;
}

export function articleUrl(title: string, revisionId?: number): string {
  const base = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  return revisionId ? `${base}?oldid=${revisionId}` : base;
}
