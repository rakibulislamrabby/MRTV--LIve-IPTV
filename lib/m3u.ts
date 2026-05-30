import type { Channel, ChannelSource } from "./types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeChannelName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseExtInf(line: string): {
  name: string;
  logo?: string;
  group?: string;
} {
  const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
  const groupMatch = line.match(/group-title="([^"]*)"/i);
  const commaIndex = line.lastIndexOf(",");

  const name =
    commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : "Unknown Channel";

  return {
    name,
    logo: logoMatch?.[1] || undefined,
    group: groupMatch?.[1] || undefined,
  };
}

function isStreamUrl(line: string): boolean {
  return /^https?:\/\//i.test(line) || line.endsWith(".m3u8") || line.endsWith(".mpd");
}

export function parseM3U(content: string, source: ChannelSource): Channel[] {
  const lines = content.split(/\r?\n/);
  const channels: Channel[] = [];
  let pending: ReturnType<typeof parseExtInf> | null = null;
  const usedIds = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === "#EXTM3U") continue;

    if (line.startsWith("#EXTINF:")) {
      pending = parseExtInf(line);
      continue;
    }

    if (pending && isStreamUrl(line)) {
      const defaultGroup = source === "sky" ? "Sky Channels" : "Other";
      const group = pending.group?.trim() || defaultGroup;
      const baseId = `${source}-${slugify(pending.name)}`;
      let id = baseId;
      let suffix = 1;

      while (usedIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }

      usedIds.add(id);
      channels.push({
        id,
        name: pending.name,
        url: line,
        logo: pending.logo,
        group,
        source,
      });
      pending = null;
    }
  }

  return channels;
}
