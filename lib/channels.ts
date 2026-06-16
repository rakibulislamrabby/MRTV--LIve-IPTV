export interface Channel {
  id: string;
  name: string;
  url: string;
  fallbackUrl?: string;
  logo?: string;
  group: string;
  isFeatured?: boolean;
}

export const CHANNELS: Channel[] = [
  {
    id: "t-sports",
    name: "T Sports HD B 🇧🇩",
    url: "http://198.195.239.50:8095/tsports/tracks-v1a1/mono.m3u8",
    fallbackUrl: "https://tvsen7.aynaott.com/tsportsfhd/index.m3u8",
    logo: "https://imglink.cc/cdn/RY7jBwPKAr.jpg",
    group: "Sports",
    isFeatured: true,
  },
  {
    id: "tyc-sports",
    name: "TyC Sports ARG",
    url: "https://1nyaler.streamhostingcdn.top/stream/84/index.m3u8",
    logo: "/logos/tyc-sports.svg",
    group: "Argentina",
  },
];

export function getChannelById(id: string): Channel | undefined {
  return CHANNELS.find((channel) => channel.id === id);
}

export function getPlaybackUrls(channel: Channel, useFallback: boolean): string[] {
  if (useFallback && channel.fallbackUrl) {
    return [channel.fallbackUrl];
  }

  if (!channel.fallbackUrl || channel.fallbackUrl === channel.url) {
    return [channel.url];
  }

  const primaryIsIpHttp = /^http:\/\/\d{1,3}(\.\d{1,3}){3}/.test(channel.url);
  const onNetlify = process.env.NETLIFY === "true";

  if (onNetlify && primaryIsIpHttp) {
    return [channel.fallbackUrl, channel.url];
  }

  return [channel.url, channel.fallbackUrl];
}
