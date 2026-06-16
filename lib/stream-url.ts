import type { Channel } from "./types";

export function isExpiredSignedUrl(url: string): boolean {
  const match = url.match(/[?&]e=(\d+)/);
  if (!match) return false;

  const expiresAtMs = Number(match[1]) * 1000;
  return Number.isFinite(expiresAtMs) && expiresAtMs < Date.now();
}

export function getPlaybackCandidates(channel: Channel, forceFallback: boolean): string[] {
  if (forceFallback) {
    return channel.fallbackUrl ? [channel.fallbackUrl] : [channel.url];
  }

  if (!channel.fallbackUrl || channel.fallbackUrl === channel.url) {
    return [channel.url];
  }

  if (isExpiredSignedUrl(channel.url)) {
    return [channel.fallbackUrl, channel.url];
  }

  return [channel.url, channel.fallbackUrl];
}

export function getUpstreamRequestHeaders(target: string): Record<string, string> {
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

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      headers.Referer = `${parsed.protocol}//${parsed.host}/`;
      return headers;
    }

    headers.Referer = `${parsed.protocol}//${parsed.host}/`;
  } catch {
    // ignore invalid target URL
  }

  return headers;
}
