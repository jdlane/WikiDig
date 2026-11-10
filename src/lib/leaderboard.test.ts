import { afterEach, describe, expect, it, vi } from 'vitest';
import { bucketFor, fetchRanking, submitDailyScore } from './leaderboard';

describe('bucketFor', () => {
  it('maps scores to tenths, with a perfect score in the last bar', () => {
    expect(bucketFor(0)).toBe(0);
    expect(bucketFor(999)).toBe(0);
    expect(bucketFor(8734)).toBe(8);
    expect(bucketFor(10_000)).toBe(9);
  });
});

describe('network calls', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('do nothing without Supabase config', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await submitDailyScore('2026-11-09', 5000)).toBe(false);
    expect(await fetchRanking('2026-11-09', 5000)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('with config', () => {
    const configure = (response: Partial<Response>) => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
      const fetchMock = vi.fn().mockResolvedValue(response);
      vi.stubGlobal('fetch', fetchMock);
      return fetchMock;
    };

    it('treats an existing score for the day as stored', async () => {
      configure({ ok: false, status: 409 });
      expect(await submitDailyScore('2026-11-01', 5000)).toBe(true);
    });

    it('sends one request for a day, even when called twice at once or after a reload', async () => {
      const fetchMock = configure({ ok: true, status: 201 });
      const [a, b] = await Promise.all([submitDailyScore('2026-11-02', 5000), submitDailyScore('2026-11-02', 5000)]);
      expect([a, b]).toEqual([true, true]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('wikidepth:submittedDate')).toBe('2026-11-02');
    });

    it('retries after a failed submission', async () => {
      const fetchMock = configure({ ok: false, status: 500 });
      expect(await submitDailyScore('2026-11-03', 5000)).toBe(false);
      fetchMock.mockResolvedValue({ ok: true, status: 201 });
      expect(await submitDailyScore('2026-11-03', 5000)).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('swallows network failures', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
      expect(await submitDailyScore('2026-11-04', 5000)).toBe(false);
      expect(await fetchRanking('2026-11-09', 5000)).toBeNull();
    });

    it('reads an unranked day', async () => {
      configure({ ok: true, status: 200, json: async () => ({ ranked: false }) });
      expect((await fetchRanking('2026-11-09', 5000))?.ranked).toBe(false);
    });

    it('reads a ranked day, padding the histogram to ten bars', async () => {
      const fetchMock = configure({
        ok: true,
        status: 200,
        json: async () => ({ ranked: true, beaten: 0.8, buckets: [0.4, 0.6] }),
      });
      const r = await fetchRanking('2026-11-09', 5000);
      expect(r).toEqual({ ranked: true, beaten: 0.8, buckets: [0.4, 0.6, 0, 0, 0, 0, 0, 0, 0, 0] });
      expect(fetchMock.mock.calls[0][0]).toBe('https://example.supabase.co/rest/v1/rpc/daily_ranking');
    });
  });
});
