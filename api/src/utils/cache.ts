type Entry = { value: any; expiresAt: number };
const store = new Map<string, Entry>();

export function setCache(key: string, value: any, ttlMs: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function getCache<T = any>(key: string): T | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    return null;
  }
  return e.value as T;
}