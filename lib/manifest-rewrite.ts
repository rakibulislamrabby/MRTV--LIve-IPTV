import { encodeStreamTarget, isAllowedStreamUrl } from "./stream-token";

function toProxyUrl(targetUrl: string): string {
  return `/api/segment?t=${encodeURIComponent(encodeStreamTarget(targetUrl))}`;
}

export function rewriteManifest(manifest: string, baseUrl: string): string {
  const base = new URL(baseUrl);

  return manifest
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        const uriMatch = trimmed.match(/^#EXT-X-MEDIA:.*URI="([^"]+)"/i);
        if (uriMatch?.[1]) {
          try {
            const resolved = new URL(uriMatch[1], base).toString();
            if (isAllowedStreamUrl(resolved)) {
              return line.replace(uriMatch[1], toProxyUrl(resolved));
            }
          } catch {
            return line;
          }
        }
        return line;
      }

      try {
        const resolved = new URL(trimmed, base).toString();
        if (!isAllowedStreamUrl(resolved)) return line;
        return toProxyUrl(resolved);
      } catch {
        return line;
      }
    })
    .join("\n");
}
