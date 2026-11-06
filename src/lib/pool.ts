import { FALLBACK_POOL, type Puzzle } from '../data/puzzles';

/** Shape of public/pool.json, written by scripts/build-pool.ts. */
export interface PoolEntry extends Puzzle {
  revisionId: number;
  topic: string;
  /** Scorable words in the article when the pool was built. */
  words: number;
}

export interface PoolFile {
  generatedAt: string;
  entries: PoolEntry[];
}

let pool: Promise<Puzzle[]> | null = null;

/** The ordered puzzle pool (entry N is day N+1). Falls back to a small built-in list. */
export function loadPool(): Promise<Puzzle[]> {
  pool ??= fetch(`${import.meta.env.BASE_URL}pool.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`pool.json: ${res.status}`);
      return res.json() as Promise<PoolFile>;
    })
    .then((file) => (file.entries.length ? file.entries : FALLBACK_POOL))
    .catch((err: unknown) => {
      console.warn('Using fallback puzzle pool:', err);
      return FALLBACK_POOL;
    });
  return pool;
}
