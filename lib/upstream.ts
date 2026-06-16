const TIMEOUT_MS = 18_000;

export function upstreamHeaders(target: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    const parsed = new URL(target);
    const host = parsed.hostname;

    if (host.includes("aynaott.com")) {
      headers.Origin = "https://aynaott.com";
      headers.Referer = "https://aynaott.com/";
      return headers;
    }

    if (host.includes("streamhostingcdn.top")) {
      headers.Referer = `${parsed.protocol}//${parsed.host}/`;
      return headers;
    }

    headers.Referer = `${parsed.protocol}//${parsed.host}/`;
  } catch {
    // ignore
  }

  return headers;
}

export function isHlsManifest(target: string, contentType = ""): boolean {
  return (
    target.includes(".m3u8") ||
    target.includes(".m3u") ||
    contentType.includes("mpegurl") ||
    contentType.includes("m3u")
  );
}

export function segmentContentType(target: string, upstreamType: string): string {
  if (isHlsManifest(target, upstreamType)) {
    return "application/vnd.apple.mpegurl";
  }
  if (target.endsWith(".ts") || upstreamType.includes("mp2t")) {
    return "video/mp2t";
  }
  return upstreamType || "application/octet-stream";
}

export async function fetchUpstream(
  target: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(target, {
      ...init,
      signal: controller.signal,
      headers: {
        ...upstreamHeaders(target),
        ...(init.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}
