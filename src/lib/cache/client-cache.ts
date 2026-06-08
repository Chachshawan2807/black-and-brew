interface CacheEntry<T> {
  data: T;
  savedAt: number;
  source: 'server' | 'local';
}

export function readCache<T>(key: string): { data: T | null; savedAt: number | null } {
  if (typeof window === 'undefined') {
    return { data: null, savedAt: null };
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { data: null, savedAt: null };
    const entry: CacheEntry<T> = JSON.parse(raw);
    return { data: entry.data ?? null, savedAt: entry.savedAt ?? null };
  } catch {
    return { data: null, savedAt: null };
  }
}

export function writeCache<T>(key: string, data: T, source: 'server' | 'local'): void {
  if (typeof window === 'undefined') return;
  const entry: CacheEntry<T> = { data, savedAt: Date.now(), source };
  localStorage.setItem(key, JSON.stringify(entry));
}

export function isStale(savedAt: number, ttlMs: number): boolean {
  return (Date.now() - savedAt) >= ttlMs;
}

export function mergeWithServer<T>(local: T | null, server: T, _serverTimestamp: number): T {
  if (local === null) return server;
  return server;
}
