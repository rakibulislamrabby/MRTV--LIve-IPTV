export interface Channel {
  id: string;
  name: string;
  url: string;
  fallbackUrls?: string[];
  logo?: string;
  group: string;
  isFeatured?: boolean;
}

const AYNAOTT_TSPORTS_SIGNED =
  "https://tvsen7.aynaott.com/tsports-hd/index.m3u8?e=1779283784&u=78be6644-0a65-48ec-81a4-089ac65a2619&token=3b4c5a2cfa872fa7f91ffbfb4aa0f658";

export const CHANNELS: Channel[] = [
  {
    id: "t-sports",
    name: "T Sports HD B 🇧🇩",
    url: "http://198.195.239.50:8095/tsports/tracks-v1a1/mono.m3u8",
    fallbackUrls: [
      AYNAOTT_TSPORTS_SIGNED,
      "https://tvsen7.aynaott.com/tsportsfhd/index.m3u8",
      "https://tvsen7.aynaott.com/tsports-hd/index.m3u8",
    ],
    logo: "https://imglink.cc/cdn/RY7jBwPKAr.jpg",
    group: "Sports",
    isFeatured: true,
  },
  {
    id: "tyc-sports",
    name: "TyC Sports ARG",
    url: "https://1nyaler.streamhostingcdn.top/stream/84/index.m3u8",
    fallbackUrls: ["http://cdn.tv-rds.workers.dev/TYCSPT.m3u8"],
    logo: "/logos/tyc-sports.svg",
    group: "Argentina",
  },
];

export function getChannelById(id: string): Channel | undefined {
  return CHANNELS.find((channel) => channel.id === id);
}

export function getFeaturedChannel(): Channel | undefined {
  if (isDatacenterHost()) {
    return CHANNELS.find((channel) => channel.id === "tyc-sports") ?? CHANNELS[0];
  }
  return CHANNELS.find((channel) => channel.isFeatured) ?? CHANNELS[0];
}

function isDatacenterHost(): boolean {
  return process.env.NETLIFY === "true" || process.env.VERCEL === "1";
}

export function getPlaybackUrls(channel: Channel, useFallbackOnly: boolean): string[] {
  const fallbacks = channel.fallbackUrls ?? [];
  const onDatacenter = isDatacenterHost();

  if (useFallbackOnly) {
    return fallbacks.length > 0 ? fallbacks : [channel.url];
  }

  if (onDatacenter && isPrivateIpStream(channel.url)) {
    return fallbacks.length > 0 ? fallbacks : [];
  }

  const urls = [channel.url, ...fallbacks.filter((url) => url !== channel.url)];
  return [...new Set(urls)];
}

function isPrivateIpStream(url: string): boolean {
  return /^http:\/\/\d{1,3}(\.\d{1,3}){3}/.test(url);
}
