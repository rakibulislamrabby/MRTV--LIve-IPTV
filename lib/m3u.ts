import type { Channel, ChannelSource } from "./types";

const SPORTS_NAME_PATTERN =
  /\b(sport|fifa|cricket|espn|bein|willow|tsn|nfl|nba|golf|fox sports|star sports|ptv sports|t[\s-]?sports|asports|tyc sports|tudn|euro tv|talk sport|marquee|sports grid|xtream sports|bahrain sports|dd sports|nbc sports|bleav|ktv sport|sports first|premier league|champions league|wwe|ufc|f1)\b/i;

export function isSportsChannel(name: string): boolean {
  return SPORTS_NAME_PATTERN.test(name);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeChannelName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

export const GROUP_PRIORITY = [
  "Bangla",
  "Sports",
  "News",
  "Entertainment",
  "Kids",
  "Others",
];

function groupSortIndex(group: string): number {
  const index = GROUP_PRIORITY.indexOf(group);
  return index === -1 ? GROUP_PRIORITY.length : index;
}

const SPORTS_TOP_PRIORITY: RegExp[] = [
  /t[\s-]?sports/i,
  /ptv\s*sports/i,
  /fifa/i,
];

function sportsShowPriority(name: string, group: string): number {
  if (group.toLowerCase() !== "sports") {
    return SPORTS_TOP_PRIORITY.length;
  }

  for (let index = 0; index < SPORTS_TOP_PRIORITY.length; index += 1) {
    if (SPORTS_TOP_PRIORITY[index].test(name)) return index;
  }

  return SPORTS_TOP_PRIORITY.length;
}

export function findTopSportsChannel(
  channels: Channel[],
  sportsGroup: string,
): Channel | null {
  const sports = channels.filter((channel) => channel.group === sportsGroup);

  for (const pattern of SPORTS_TOP_PRIORITY) {
    const match = sports.find((channel) => pattern.test(channel.name));
    if (match) return match;
  }

  return sports[0] ?? null;
}

export function sortChannels(channels: Channel[]): Channel[] {
  return [...channels].sort((a, b) => {
    const groupDiff = groupSortIndex(a.group) - groupSortIndex(b.group);
    if (groupDiff !== 0) return groupDiff;

    const priorityDiff =
      sportsShowPriority(a.name, a.group) -
      sportsShowPriority(b.name, b.group);
    if (priorityDiff !== 0) return priorityDiff;

    const logoDiff = Number(Boolean(b.logo)) - Number(Boolean(a.logo));
    if (logoDiff !== 0) return logoDiff;

    const nameDiff = a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
      numeric: true,
    });
    if (nameDiff !== 0) return nameDiff;

    return a.id.localeCompare(b.id);
  });
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
      const defaultGroup =
        source === "sky"
          ? "Sky Channels"
          : source === "sports"
            ? isSportsChannel(pending.name)
              ? "Sports"
              : "Others"
            : "Other";
      const group = pending.group?.trim() || defaultGroup;
      const url = decodeHtmlEntities(line);
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
        url,
        logo: pending.logo,
        group,
        source,
      });
      pending = null;
    }
  }

  return channels;
}
