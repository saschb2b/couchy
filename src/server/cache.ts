interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export async function withCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key);
  if (entry && entry.expiresAt > now) {
    return entry.value as T;
  }
  const value = await fetcher();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function invalidate(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}
