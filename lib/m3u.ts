import type { ClientChannel } from "./client-channel";
import type { Channel, ChannelSource } from "./types";

type SortableChannel = Pick<Channel, "id" | "name" | "group" | "logo"> & {
  fallbackUrl?: string;
  hasBackup?: boolean;
};

function hasBackupStream(channel: SortableChannel): boolean {
  return Boolean(channel.fallbackUrl ?? channel.hasBackup);
}

const SPORTS_NAME_PATTERN =
  /\b(sport|fifa|cricket|espn|bein|willow|tsn|nfl|nba|golf|fox sports|star sports|ptv sports|t[\s-]?sports|asports|tyc sports|tudn|euro\s*sport|euro tv|talk sport|marquee|sports grid|xtream sports|bahrain sports|dd sports|nbc sports|bleav|ktv sport|sports first|premier league|champions league|wwe|ufc|f1|world cup|win\s*\+?|tnt|hub sports|sky sport|dazn|tivibu|tabii|sport\s*klub|trt spor|cosmote|prima sport|ziggo|racing|combate|max sport|smart sport|s sport|hub sport|wimbledon|uefa|laliga|bundesliga|serie a|ligue 1|mlb|nhl|motogp)\b/i;

const SPORTS_SOURCES = new Set([
  "sports",
  "sports-fifa-wc",
  "sports-new",
]);

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
  /star\s*sports\s*1\s*hd/i,
  /ptv\s*sports/i,
  /star\s*sports/i,
  /^t\s+sports\b/i,
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
  channels: ClientChannel[],
  sportsGroup: string,
): ClientChannel | null {
  const sports = channels.filter((channel) => channel.group === sportsGroup);

  for (const pattern of SPORTS_TOP_PRIORITY) {
    const match = sports.find((channel) => pattern.test(channel.name));
    if (match) return match;
  }

  return sports[0] ?? null;
}

export function findPtvSportsChannel(
  channels: ClientChannel[],
): ClientChannel | null {
  const matches = channels.filter(
    (channel) =>
      channel.group.toLowerCase() === "sports" &&
      /ptv\s*sports/i.test(channel.name),
  );

  return (
    matches.find((channel) => channel.source === "aynaott") ?? matches[0] ?? null
  );
}

export function sortChannels<T extends SortableChannel>(channels: T[]): T[] {
  return [...channels].sort((a, b) => {
    const groupDiff = groupSortIndex(a.group) - groupSortIndex(b.group);
    if (groupDiff !== 0) return groupDiff;

    const backupDiff =
      Number(hasBackupStream(b)) - Number(hasBackupStream(a));
    if (backupDiff !== 0) return backupDiff;

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
          : SPORTS_SOURCES.has(source)
            ? source === "sports-new"
              ? isSportsChannel(pending.name)
                ? "Sports"
                : "Others"
              : "Sports"
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
