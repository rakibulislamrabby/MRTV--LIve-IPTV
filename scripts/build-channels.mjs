import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const outputPath = path.join(root, "generated/channels.json");

const FIFA_LOGO =
  "https://raw.githubusercontent.com/Rakib49/Rakibiptv/main/images%20(11).jpeg";
const BEIN_LOGO = "/logos/bein-sports.svg";
const TUDN_LOGO = "/logos/tudn.svg";
const TYC_LOGO = "/logos/tyc-sports.svg";
const EUROSPORT_LOGO = "/logos/eurosport.svg";
const STAR_SPORTS_LOGO =
  "https://raw.githubusercontent.com/Rakib49/Rakibiptv/main/Star_Sports_1_HD.png";

const LOGO_ALIASES = {
  "fifa plus english": "fifa+ channel",
  "fifa plus b": "fifa+ channel",
  "fox sports 2": "fox sports 2",
  "ptv sports": "ptv sports",
  asports: "a sports",
  "star sports 1": "star sports 1 hd",
  "star sports 1 b": "star sports 1 hd",
  "t sports": "t sports hd",
  "t sports b": "t sports hd",
  espn: "espn",
  "goldmines movies": "goldmines bollywood",
  goldmines: "goldmines bollywood",
  "ekattor tv hd": "ekattor tv",
  "somoy tv": "somoy news tv",
  "news 24": "news 24 bd",
  "rtv live": "rtv",
  btv: "btv ctg",
  "channel 9 hd": "channel 9",
  "ekushe tv": "etv",
};

const BRAND_LOGOS = [
  [/bein\s*sports/i, BEIN_LOGO],
  [/tudn/i, TUDN_LOGO],
  [/tyc\s*sports/i, TYC_LOGO],
  [/euro\s*tv/i, EUROSPORT_LOGO],
  [/star\s*sports/i, STAR_SPORTS_LOGO],
  [/fifa\s*plus|^fifa\+/i, FIFA_LOGO],
];

const SPORTS_NAME_PATTERN =
  /\b(sport|fifa|cricket|espn|bein|willow|tsn|nfl|nba|golf|fox sports|star sports|ptv sports|t[\s-]?sports|asports|tyc sports|tudn|euro tv|talk sport|marquee|sports grid|xtream sports|bahrain sports|dd sports|nbc sports|bleav|ktv sport|sports first|premier league|champions league|wwe|ufc|f1)\b/i;

function normalizeChannelName(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function isSportsChannel(name) {
  return SPORTS_NAME_PATTERN.test(name);
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseExtInf(line) {
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

function isStreamUrl(line) {
  return /^https?:\/\//i.test(line) || line.endsWith(".m3u8") || line.endsWith(".mpd");
}

function parseM3U(content, source) {
  const lines = content.split(/\r?\n/);
  const channels = [];
  let pending = null;
  const usedIds = new Set();

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

function normalizeLogoKey(name) {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+b-\s*/g, " ")
    .replace(/\s+b$/i, "")
    .replace(/\s+-\s+/g, " ")
    .replace(/[^\w\s+]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildLogoLookup(channels) {
  const lookup = new Map();

  for (const channel of channels) {
    if (!channel.logo) continue;

    const keys = [normalizeLogoKey(channel.name), normalizeChannelName(channel.name)];
    for (const key of keys) {
      if (key && !lookup.has(key)) {
        lookup.set(key, channel.logo);
      }
    }
  }

  return lookup;
}

function resolveLogo(name, lookup) {
  const key = normalizeLogoKey(name);
  const aliasKey = LOGO_ALIASES[key];
  const candidates = [key, aliasKey, normalizeChannelName(name)].filter(Boolean);

  for (const candidate of candidates) {
    const logo = lookup.get(candidate);
    if (logo) return logo;
  }

  for (const [pattern, logo] of BRAND_LOGOS) {
    if (pattern.test(name)) return logo;
  }

  return undefined;
}

function attachLogo(channel, lookup) {
  if (channel.logo) return channel;

  const logo = resolveLogo(channel.name, lookup);
  return logo ? { ...channel, logo } : channel;
}

const GROUP_PRIORITY = [
  "Bangla",
  "Sports",
  "News",
  "Entertainment",
  "Kids",
  "Others",
];

function groupSortIndex(group) {
  const index = GROUP_PRIORITY.indexOf(group);
  return index === -1 ? GROUP_PRIORITY.length : index;
}

const SPORTS_TOP_PRIORITY = [
  /t[\s-]?sports/i,
  /ptv\s*sports/i,
  /fifa/i,
];

function sportsShowPriority(name, group) {
  if (group.toLowerCase() !== "sports") {
    return SPORTS_TOP_PRIORITY.length;
  }

  for (let index = 0; index < SPORTS_TOP_PRIORITY.length; index += 1) {
    if (SPORTS_TOP_PRIORITY[index].test(name)) return index;
  }

  return SPORTS_TOP_PRIORITY.length;
}

function sortChannels(channels) {
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

function attachFallback(channel, fallbacks) {
  const fallbackUrl = fallbacks.get(normalizeChannelName(channel.name));

  return {
    ...channel,
    fallbackUrl:
      fallbackUrl && fallbackUrl !== channel.url ? fallbackUrl : undefined,
  };
}

function buildChannelList() {
  const aynaContent = fs.readFileSync(path.join(publicDir, "aynaott.m3u"), "utf-8");
  const skyContent = fs.readFileSync(path.join(publicDir, "Skym3u-176.m3u"), "utf-8");
  const sportsContent = fs.readFileSync(path.join(publicDir, "sports.m3u"), "utf-8");
  const aynaChannels = parseM3U(aynaContent, "aynaott");
  const skyChannels = parseM3U(skyContent, "sky");
  const sportsChannels = parseM3U(sportsContent, "sports");
  const logoLookup = buildLogoLookup(aynaChannels);
  const skyFallbacks = new Map();

  for (const channel of skyChannels) {
    const key = normalizeChannelName(channel.name);
    if (!skyFallbacks.has(key)) {
      skyFallbacks.set(key, channel.url);
    }
  }

  const baseChannels = aynaChannels.map((channel) =>
    attachFallback(channel, skyFallbacks),
  );
  const knownUrls = new Set(baseChannels.map((channel) => channel.url));
  const extraChannels = sportsChannels
    .filter((channel) => !knownUrls.has(channel.url))
    .map((channel) => attachFallback(channel, skyFallbacks))
    .map((channel) => attachLogo(channel, logoLookup));

  return sortChannels([...baseChannels, ...extraChannels]);
}

const channels = buildChannelList();
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(channels));
console.log(`Generated ${channels.length} channels -> generated/channels.json`);
