const trips = new Map<string, number>();

export function isTripped(key: string): boolean {
  const t = trips.get(key);
  if (!t) return false;
  if (Date.now() > t) {
    trips.delete(key);
    return false;
  }
  return true;
}

export function trip(key: string, ttlMs: number) {
  trips.set(key, Date.now() + ttlMs);
}