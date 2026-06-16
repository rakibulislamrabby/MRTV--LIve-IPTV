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

function inferGroup(name: string, groupTitle?: string): string {
  if (groupTitle?.trim()) return groupTitle.trim();
  if (/tyc|argentina/i.test(name)) return "Argentina";
  if (/sport/i.test(name)) return "Sports";
  return "Live Sports";
}

function resolveLogo(name: string, attributes: Record<string, string>): string | undefined {
  if (attributes["tvg-logo"]) return attributes["tvg-logo"];
  if (/tyc/i.test(name)) return "/logos/tyc-sports.svg";
  if (/\bT Sports\b/i.test(name)) return "/logos/t-sports.svg";
  return undefined;
}

export function parseM3uPlaylist(content: string): Channel[] {
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
    const id = `fifa-${hash(`${name}-${url}`)}`;

    channels.push({
      id,
      name,
      url,
      group: inferGroup(name, attributes["group-title"]),
      logo: resolveLogo(name, attributes),
      isFeatured: channels.length === 0,
    });

    currentInfo = undefined;
  }

  return channels;
}
