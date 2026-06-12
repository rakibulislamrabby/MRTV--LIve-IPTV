import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { filterWorkingChannels } from "./validate-stream.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const playlistDir = path.join(root, "data/playlists");
const outputPath = path.join(root, "generated/channels.json");
const streamHealthPath = path.join(root, "generated/stream-health.json");

const HEALTH_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const EXTRA_SPORTS_PLAYLISTS = [
  { file: "fifa-wrold-cupm3u", source: "sports-fifa-wc", sportsOnly: false },
  { file: "4-Update-New.m3u", source: "sports-new", sportsOnly: true },
];

const SPORTS_SOURCES = new Set([
  "sports",
  "sports-fifa-wc",
  "sports-new",
]);

function isPlaylistFile(filename) {
  if (filename.endsWith(".m3u")) return true;
  if (filename === "fifa-wrold-cupm3u") return true;
  return false;
}

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
  /\b(sport|fifa|cricket|espn|bein|willow|tsn|nfl|nba|golf|fox sports|star sports|ptv sports|t[\s-]?sports|asports|tyc sports|tudn|euro\s*sport|euro tv|talk sport|marquee|sports grid|xtream sports|bahrain sports|dd sports|nbc sports|bleav|ktv sport|sports first|premier league|champions league|wwe|ufc|f1|world cup|win\s*\+?|tnt|hub sports|sky sport|dazn|tivibu|tabii|sport\s*klub|trt spor|cosmote|prima sport|ziggo|racing|combate|max sport|smart sport|s sport|hub sport|wimbledon|uefa|laliga|bundesliga|serie a|ligue 1|mlb|nhl|motogp)\b/i;

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
  /star\s*sports\s*1\s*hd/i,
  /ptv\s*sports/i,
  /star\s*sports/i,
  /^t\s+sports\b/i,
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

    const backupDiff =
      Number(Boolean(b.fallbackUrl)) - Number(Boolean(a.fallbackUrl));
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

function buildSkyFallbackMap(channels) {
  const urlsByName = new Map();

  for (const channel of channels) {
    const key = normalizeChannelName(channel.name);
    const urls = urlsByName.get(key) ?? new Set();
    urls.add(channel.url);
    urlsByName.set(key, urls);
  }

  const fallbacks = new Map();
  for (const [key, urls] of urlsByName) {
    // Skip ambiguous names to avoid mapping backup from another channel.
    if (urls.size !== 1) continue;
    const [url] = [...urls];
    if (url) fallbacks.set(key, url);
  }

  return fallbacks;
}

function attachFallback(channel, fallbacks) {
  const fallbackUrl = fallbacks.get(normalizeChannelName(channel.name));

  return {
    ...channel,
    fallbackUrl:
      fallbackUrl && fallbackUrl !== channel.url ? fallbackUrl : undefined,
  };
}

function loadStreamHealthCache() {
  if (!fs.existsSync(streamHealthPath)) return {};

  try {
    return JSON.parse(fs.readFileSync(streamHealthPath, "utf-8"));
  } catch {
    return {};
  }
}

function saveStreamHealthCache(cache) {
  fs.mkdirSync(path.dirname(streamHealthPath), { recursive: true });
  fs.writeFileSync(streamHealthPath, JSON.stringify(cache, null, 2));
}

async function getWorkingUrlSet(channels) {
  const cache = loadStreamHealthCache();
  const now = Date.now();
  const allUrls = [...new Set(
    channels.flatMap((channel) => [channel.url, channel.fallbackUrl]).filter(Boolean),
  )];

  const staleOrMissing = allUrls.filter((url) => {
    if (process.env.FORCE_STREAM_REVALIDATE === "1") return true;
    const cached = cache[url];
    if (!cached) return true;
    return now - cached.checkedAt > HEALTH_CACHE_TTL_MS;
  });

  if (staleOrMissing.length > 0) {
    console.log(`\nValidating ${staleOrMissing.length} stream URLs...`);
    const probeItems = staleOrMissing.map((url, index) => ({
      id: `probe-${index}`,
      name: url,
      url,
      group: "Probe",
      source: "aynaott",
    }));
    const workingItems = await filterWorkingChannels(probeItems, {
      concurrency: 14,
    });
    const working = new Set(workingItems.map((item) => item.url));

    if (
      working.size === 0 &&
      staleOrMissing.length >= 25 &&
      process.env.FORCE_STRICT_STABLE !== "1"
    ) {
      console.warn(
        "Stream probing returned 0 results. Keeping existing cache to avoid wiping channel catalog.",
      );
      const cachedWorking = new Set(
        allUrls.filter((url) => cache[url]?.ok),
      );
      if (cachedWorking.size > 0) {
        return cachedWorking;
      }
      return new Set(allUrls);
    }

    for (const url of staleOrMissing) {
      cache[url] = { ok: working.has(url), checkedAt: now };
    }

    saveStreamHealthCache(cache);
  }

  const cachedWorking = new Set(allUrls.filter((url) => cache[url]?.ok));
  if (
    cachedWorking.size === 0 &&
    allUrls.length > 0 &&
    process.env.FORCE_STRICT_STABLE !== "1"
  ) {
    console.warn(
      "No cached healthy streams found. Falling back to unfiltered channels for safety.",
    );
    return new Set(allUrls);
  }

  return cachedWorking;
}

function keepStableChannels(channels, workingUrls) {
  const stable = [];

  for (const channel of channels) {
    if (workingUrls.has(channel.url)) {
      stable.push(channel);
      continue;
    }

    if (channel.fallbackUrl && workingUrls.has(channel.fallbackUrl)) {
      stable.push({
        ...channel,
        url: channel.fallbackUrl,
        fallbackUrl: undefined,
      });
      continue;
    }

    // Keep every PTV entry visible in Sports even when probe fails.
    if (isPtvChannel(channel)) {
      stable.push(channel);
    }
  }

  return stable;
}

function isPtvChannel(channel) {
  return /ptv/i.test(channel.name);
}

function getPlaylistMtime() {
  return Math.max(
    ...fs
      .readdirSync(playlistDir)
      .filter(isPlaylistFile)
      .map((file) => fs.statSync(path.join(playlistDir, file)).mtimeMs),
  );
}

function isBuildUpToDate() {
  if (process.env.FORCE_CHANNELS_BUILD === "1") return false;
  if (!fs.existsSync(outputPath)) return false;

  const playlistMtime = getPlaylistMtime();
  const channelsMtime = fs.statSync(outputPath).mtimeMs;

  return channelsMtime >= playlistMtime;
}

if (isBuildUpToDate()) {
  const existing = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
  console.log(
    `Channels up to date (${existing.length} channels), skipping build.`,
  );
  process.exit(0);
}

async function buildChannelList() {
  const aynaContent = fs.readFileSync(
    path.join(playlistDir, "aynaott.m3u"),
    "utf-8",
  );
  const skyContent = fs.readFileSync(
    path.join(playlistDir, "Skym3u-176.m3u"),
    "utf-8",
  );
  const aynaChannels = parseM3U(aynaContent, "aynaott");
  const skyChannels = parseM3U(skyContent, "sky");
  const logoLookup = buildLogoLookup(aynaChannels);
  const skyFallbacks = buildSkyFallbackMap(skyChannels);

  const baseChannels = aynaChannels.map((channel) =>
    attachFallback(channel, skyFallbacks),
  );
  const knownUrls = new Set(baseChannels.map((channel) => channel.url));
  const extraChannels = [];

  for (const playlist of EXTRA_SPORTS_PLAYLISTS) {
    const playlistPath = path.join(playlistDir, playlist.file);
    if (!fs.existsSync(playlistPath)) {
      console.warn(`Skipping missing playlist: ${playlist.file}`);
      continue;
    }

    const content = fs.readFileSync(playlistPath, "utf-8");
    let candidates = parseM3U(content, playlist.source).filter(
      (channel) => channel.group === "Sports",
    );

    if (playlist.sportsOnly) {
      candidates = candidates.filter((channel) =>
        isSportsChannel(channel.name),
      );
    }

    console.log(`\n${playlist.file}: ${candidates.length} sports channels`);

    for (const channel of candidates) {
      if (!isPtvChannel(channel) && knownUrls.has(channel.url)) continue;
      knownUrls.add(channel.url);
      extraChannels.push(
        attachLogo(
          attachFallback(channel, skyFallbacks),
          logoLookup,
        ),
      );
    }
  }

  const merged = sortChannels([...baseChannels, ...extraChannels]);
  const workingUrls = await getWorkingUrlSet(merged);
  let stable = keepStableChannels(merged, workingUrls);

  const ptvChannels = merged.filter(isPtvChannel);
  const stablePtvIds = new Set(stable.filter(isPtvChannel).map((channel) => channel.id));
  for (const ptvChannel of ptvChannels) {
    if (!stablePtvIds.has(ptvChannel.id)) {
      stable.push(ptvChannel);
      stablePtvIds.add(ptvChannel.id);
    }
  }

  console.log(
    `PTV channels kept: ${stable.filter(isPtvChannel).length}/${ptvChannels.length}`,
  );
  console.log(`Stable channels: ${stable.length}/${merged.length}`);
  if (stable.length === 0 && merged.length > 0 && process.env.FORCE_STRICT_STABLE !== "1") {
    console.warn("Stable set empty; returning full merged list to keep UI usable.");
    return merged;
  }
  return sortChannels(stable);
}

const channels = await buildChannelList();
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(channels));
console.log(`\nGenerated ${channels.length} channels -> generated/channels.json`);
