/**
 * Global daily rankings, stored in Supabase.
 * Everything here fails quietly: with no network or no config the game plays exactly as before.
 */

const PLAYER_ID_KEY = 'wikidepth:playerId';
/** The latest day this browser's score was stored, so reloads don't resend it. */
const SUBMITTED_KEY = 'wikidepth:submittedDate';

export const BUCKETS = 10;

/**
 * How a score ranks. The server only ranks a day once more than 20 players have finished it
 */
export interface Ranking {
  ranked: boolean;
  /** Share of the day's other players this score beat, 0–1. */
  beaten: number;
  /** Share of players per 10% of depth, shallowest first. */
  buckets: number[];
}

interface Config {
  url: string;
  key: string;
}

function config(): Config | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return url && key ? { url: url.replace(/\/$/, ''), key } : null;
}

export function rankingEnabled(): boolean {
  return config() !== null;
}

/** An anonymous id for this browser, so each player counts once per day. */
export function getPlayerId(): string {
  try {
    const existing = localStorage.getItem(PLAYER_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID(); // storage unavailable: counts once per session
  }
}

function headers({ key }: Config): Record<string, string> {
  const h: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  // Legacy anon keys are JWTs and go in Authorization too; new `sb_publishable_…` keys must not.
  if (!key.startsWith('sb_')) h.Authorization = `Bearer ${key}`;
  return h;
}

function hasSubmitted(dateKey: string): boolean {
  try {
    return localStorage.getItem(SUBMITTED_KEY) === dateKey;
  } catch {
    return false;
  }
}

function markSubmitted(dateKey: string): void {
  try {
    localStorage.setItem(SUBMITTED_KEY, dateKey);
  } catch {
    /* storage unavailable: the server rejects the repeat anyway */
  }
}

/** In-flight or finished submissions this page load, so a double-mounted effect sends one request. */
const pending = new Map<string, Promise<boolean>>();

/**
 * Record a daily score once. Resolves true if it's stored (now or earlier).
 * Skips the request when this browser already stored a score for the day.
 */
export function submitDailyScore(dateKey: string, score: number): Promise<boolean> {
  if (!config()) return Promise.resolve(false);
  if (hasSubmitted(dateKey)) return Promise.resolve(true);
  let p = pending.get(dateKey);
  if (!p) {
    p = postScore(dateKey, score).then((ok) => {
      if (ok) markSubmitted(dateKey);
      else pending.delete(dateKey); // let a later mount retry
      return ok;
    });
    pending.set(dateKey, p);
  }
  return p;
}

async function postScore(dateKey: string, score: number): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/daily_scores`, {
      method: 'POST',
      headers: { ...headers(cfg), Prefer: 'return=minimal' },
      body: JSON.stringify({ puzzle_date: dateKey, player_id: getPlayerId(), score }),
    });
    return res.ok || res.status === 409; // 409: this player already has a score for the day
  } catch {
    return false;
  }
}

export async function fetchRanking(dateKey: string, score: number): Promise<Ranking | null> {
  const cfg = config();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/daily_ranking`, {
      method: 'POST',
      headers: headers(cfg),
      body: JSON.stringify({ p_date: dateKey, p_score: score }),
    });
    if (!res.ok) return null;
    const r = (await res.json()) as Partial<Ranking>;
    const buckets = Array.from({ length: BUCKETS }, (_, i) => Number(r.buckets?.[i] ?? 0));
    return { ranked: r.ranked === true, beaten: Number(r.beaten ?? 0), buckets };
  } catch {
    return null;
  }
}

/** Which histogram bar a score falls in. */
export function bucketFor(score: number): number {
  return Math.min(BUCKETS - 1, Math.max(0, Math.floor(score / 1000)));
}
