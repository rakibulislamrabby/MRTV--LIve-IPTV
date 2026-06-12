const MANIFEST_TTL_MS = 3_000;

const cache = new Map<string, { body: string; expires: number }>();

export function getCachedManifest(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.body;
}

export function setCachedManifest(key: string, body: string): void {
  cache.set(key, { body, expires: Date.now() + MANIFEST_TTL_MS });
}
