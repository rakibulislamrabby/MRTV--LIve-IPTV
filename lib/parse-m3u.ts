export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group: string;
  isFeatured?: boolean;
}

function parseAttributes(value: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([\w-]+)="([^"]*)"/g;
  let match = pattern.exec(value);

  while (match) {
    attributes[match[1]!] = match[2]!;
    match = pattern.exec(value);
  }

  return attributes;
}

function hash(value: string): string {
  let current = 0;
  for (let index = 0; index < value.length; index += 1) {
    current = (current << 5) - current + value.charCodeAt(index);
    current |= 0;
  }
  return Math.abs(current).toString(36);
}

function cleanName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export interface ParseM3uOptions {
  idPrefix?: string;
  featuredChannel?: boolean;
  defaultGroup?: string;
}

function inferGroup(
  name: string,
  groupTitle?: string,
  defaultGroup = "Live Sports",
): string {
  if (groupTitle?.trim()) return groupTitle.trim();
  if (/tyc|argentina/i.test(name)) return "Argentina";
  if (/sport|cricket|football|bein|espn|star\s?sports/i.test(name)) {
    return "Sports";
  }
  if (/news|24x7|cnn|bbc|dw\s|al\s?jazeera|press/i.test(name)) return "News";
  if (/bangla|bangladesh|ntv|rtv|btv|channel\s?i/i.test(name)) return "Bangla";
  if (/quran|sunnah|islam|makkah|saudi\s?tv/i.test(name)) return "Religious";
  if (/movie|cinema|film|bollywood|drama|music|wild|nature/i.test(name)) {
    return "Entertainment";
  }
  return defaultGroup;
}

function resolveLogo(name: string, attributes: Record<string, string>): string | undefined {
  if (attributes["tvg-logo"]) return attributes["tvg-logo"];
  if (/tyc/i.test(name)) return "/logos/tyc-sports.svg";
  if (/\bT Sports\b/i.test(name)) return "/logos/t-sports.svg";
  return undefined;
}

export function parseM3uPlaylist(
  content: string,
  options: ParseM3uOptions = {},
): Channel[] {
  const {
    idPrefix = "ch",
    featuredChannel = false,
    defaultGroup = "Live Sports",
  } = options;
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const channels: Channel[] = [];
  let currentInfo: string | undefined;

  for (const line of lines) {
    if (line.startsWith("#EXTINF")) {
      currentInfo = line;
      continue;
    }

    if (line.startsWith("#") || !currentInfo) {
      continue;
    }

    if (!/^https?:\/\//i.test(line)) {
      continue;
    }

    const metadata = currentInfo.replace(/^#EXTINF:-?\d+\s*/i, "");
    const attributes = parseAttributes(metadata);
    const [, fallbackName = "Untitled channel"] = metadata.match(/,(.*)$/) ?? [];
    const name = cleanName(attributes["tvg-name"] || fallbackName);
    const url = line;
    const id = `${idPrefix}-${hash(`${name}-${url}`)}`;

    channels.push({
      id,
      name,
      url,
      group: inferGroup(name, attributes["group-title"], defaultGroup),
      logo: resolveLogo(name, attributes),
      isFeatured: featuredChannel && channels.length === 0,
    });

    currentInfo = undefined;
  }

  return channels;
}
