const UPSTREAM_TIMEOUT_MS = 10_000;

const UPSTREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "*/*",
};

export async function fetchUpstream(
  target: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    return await fetch(target, {
      ...init,
      signal: controller.signal,
      headers: {
        ...UPSTREAM_HEADERS,
        ...(init.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

export function isHlsTarget(target: string, contentType = ""): boolean {
  return (
    target.includes(".m3u8") ||
    contentType.includes("mpegurl") ||
    contentType.includes("m3u")
  );
}
