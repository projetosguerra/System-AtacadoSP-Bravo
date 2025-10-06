type InFlight = { promise: Promise<any>; at: number };
const inflight = new Map<string, InFlight>();

export function singleFlight<T>(key: string, fn: () => Promise<T>, graceMs = 0): Promise<T> {
  const current = inflight.get(key);
  if (current) return current.promise as Promise<T>;

  const p = fn()
    .finally(() => {
      if (graceMs > 0) {
        setTimeout(() => inflight.delete(key), graceMs);
      } else {
        inflight.delete(key);
      }
    });

  inflight.set(key, { promise: p, at: Date.now() });
  return p;
}