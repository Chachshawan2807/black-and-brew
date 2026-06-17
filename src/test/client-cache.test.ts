import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readCache, writeCache, isStale, mergeWithServer } from '@/lib/cache/client-cache';

describe('client-cache', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('readCache', () => {
    it('returns null data and null savedAt when key does not exist', () => {
      const result = readCache<string>('nonexistent-key');
      expect(result.data).toBeNull();
      expect(result.savedAt).toBeNull();
    });

    it('returns stored data and savedAt when key exists', () => {
      const entry = { data: { value: 42 }, savedAt: 1000000, source: 'server' as const };
      localStorage.setItem('test-key', JSON.stringify(entry));

      const result = readCache<{ value: number }>('test-key');
      expect(result.data).toEqual({ value: 42 });
      expect(result.savedAt).toBe(1000000);
    });

    it('returns null data on malformed JSON', () => {
      localStorage.setItem('bad-key', 'not-json{{');
      const result = readCache<string>('bad-key');
      expect(result.data).toBeNull();
      expect(result.savedAt).toBeNull();
    });

    it('returns null in SSR environment (typeof window === undefined)', () => {
      const originalWindow = global.window;
      // @ts-expect-error Simulate server runtime by removing the jsdom window.
      delete global.window;

      const result = readCache<string>('any-key');
      expect(result.data).toBeNull();
      expect(result.savedAt).toBeNull();

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('writeCache', () => {
    it('writes data with savedAt and source to localStorage', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      writeCache('my-key', { foo: 'bar' }, 'server');

      const raw = localStorage.getItem('my-key');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.data).toEqual({ foo: 'bar' });
      expect(parsed.savedAt).toBe(now);
      expect(parsed.source).toBe('server');
    });

    it('writes local source correctly', () => {
      writeCache('local-key', [1, 2, 3], 'local');
      const parsed = JSON.parse(localStorage.getItem('local-key')!);
      expect(parsed.source).toBe('local');
    });
  });

  describe('isStale', () => {
    it('returns false when data is fresh (within TTL)', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      const savedAt = now - 100_000; // 100 seconds ago
      expect(isStale(savedAt, 300_000)).toBe(false); // TTL = 5 min
    });

    it('returns true when data is stale (exceeds TTL)', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      const savedAt = now - 400_000; // 400 seconds ago
      expect(isStale(savedAt, 300_000)).toBe(true); // TTL = 5 min
    });

    it('returns true when age equals TTL exactly', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      const savedAt = now - 300_000;
      expect(isStale(savedAt, 300_000)).toBe(true);
    });
  });

  describe('mergeWithServer', () => {
    it('returns server data when local is null', () => {
      const serverData = { revenue: 9999 };
      const result = mergeWithServer<{ revenue: number }>(null, serverData, Date.now());
      expect(result).toEqual(serverData);
    });

    it('server wins on conflict — returns server data', () => {
      const localData = { revenue: 100 };
      const serverData = { revenue: 999 };
      const result = mergeWithServer(localData, serverData, Date.now());
      expect(result).toEqual(serverData);
    });

    it('returns server data even when local exists', () => {
      const localData = { items: ['a', 'b'] };
      const serverData = { items: ['x', 'y', 'z'] };
      const result = mergeWithServer(localData, serverData, Date.now());
      expect(result).toEqual(serverData);
    });
  });
});
