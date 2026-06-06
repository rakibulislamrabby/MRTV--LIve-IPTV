import { normalizeChannelName } from "./m3u";
import type { Channel } from "./types";

const FIFA_LOGO =
  "https://raw.githubusercontent.com/Rakib49/Rakibiptv/main/images%20(11).jpeg";
const BEIN_LOGO = "/logos/bein-sports.svg";
const TUDN_LOGO = "/logos/tudn.svg";
const TYC_LOGO = "/logos/tyc-sports.svg";
const EUROSPORT_LOGO = "/logos/eurosport.svg";
const STAR_SPORTS_LOGO =
  "https://raw.githubusercontent.com/Rakib49/Rakibiptv/main/Star_Sports_1_HD.png";

const LOGO_ALIASES: Record<string, string> = {
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
  "goldmines": "goldmines bollywood",
  "ekattor tv hd": "ekattor tv",
  "somoy tv": "somoy news tv",
  "news 24": "news 24 bd",
  "rtv live": "rtv",
  "btv": "btv ctg",
  "channel 9 hd": "channel 9",
  "ekushe tv": "etv",
};

const BRAND_LOGOS: [RegExp, string][] = [
  [/bein\s*sports/i, BEIN_LOGO],
  [/tudn/i, TUDN_LOGO],
  [/tyc\s*sports/i, TYC_LOGO],
  [/euro\s*tv/i, EUROSPORT_LOGO],
  [/star\s*sports/i, STAR_SPORTS_LOGO],
  [/fifa\s*plus|^fifa\+/i, FIFA_LOGO],
];

export function normalizeLogoKey(name: string): string {
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

export function buildLogoLookup(channels: Channel[]): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const channel of channels) {
    if (!channel.logo) continue;

    const keys = [
      normalizeLogoKey(channel.name),
      normalizeChannelName(channel.name),
    ];

    for (const key of keys) {
      if (key && !lookup.has(key)) {
        lookup.set(key, channel.logo);
      }
    }
  }

  return lookup;
}

export function resolveLogo(
  name: string,
  lookup: Map<string, string>,
): string | undefined {
  const key = normalizeLogoKey(name);
  const aliasKey = LOGO_ALIASES[key];
  const candidates = [key, aliasKey, normalizeChannelName(name)].filter(
    Boolean,
  ) as string[];

  for (const candidate of candidates) {
    const logo = lookup.get(candidate);
    if (logo) return logo;
  }

  for (const [pattern, logo] of BRAND_LOGOS) {
    if (pattern.test(name)) return logo;
  }

  return undefined;
}

export function attachLogo(
  channel: Channel,
  lookup: Map<string, string>,
): Channel {
  if (channel.logo) return channel;

  const logo = resolveLogo(channel.name, lookup);
  return logo ? { ...channel, logo } : channel;
}
