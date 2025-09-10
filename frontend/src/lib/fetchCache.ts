// Simple in-memory cache with TTL + de-dup + stale-while-revalidate
type Entry = { ts: number; data: any; promise?: Promise<any> };
const CACHE = new Map<string, Entry>();

export async function fetchJSONCached(
  url: string,
  opts: RequestInit = {},
  ttlMs = 30_000,
  wrap?: <T>(p: Promise<T>) => Promise<T>
) {
  const now = Date.now();
  const entry = CACHE.get(url);
  const fresh = entry && now - entry.ts < ttlMs;
  if (entry?.data && fresh) return { data: entry.data, fromCache: true };

  if (entry?.promise) {
    const data = await entry.promise;
    return { data, fromCache: true };
  }

  const doFetch = async () => {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    CACHE.set(url, { ts: Date.now(), data: json });
    return json;
  };

  const promise = wrap ? wrap(doFetch()) : doFetch();
  CACHE.set(url, { ts: entry?.ts ?? 0, data: entry?.data, promise });

  try {
    const data = await promise;
    CACHE.set(url, { ts: Date.now(), data });
    return { data, fromCache: !!entry?.data };
  } finally {
    const e = CACHE.get(url);
    if (e) CACHE.set(url, { ts: e.ts, data: e.data }); // clear promise
  }
}

export function invalidate(prefix?: string) {
  if (!prefix) return CACHE.clear();
  for (const key of CACHE.keys()) if (key.startsWith(prefix)) CACHE.delete(key);
}
