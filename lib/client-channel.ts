export interface ClientChannel {
  id: string;
  name: string;
  logo?: string;
  group: string;
  streamUrl: string;
  isFeatured?: boolean;
}

export const CHANNELS: ClientChannel[] = [
  {
    id: "t-sports",
    name: "T Sports HD B 🇧🇩",
    logo: "https://imglink.cc/cdn/RY7jBwPKAr.jpg",
    group: "Sports",
    streamUrl: "http://198.195.239.50:8095/tsports/tracks-v1a1/mono.m3u8",
    isFeatured: true,
  },
  {
    id: "tyc-sports",
    name: "TyC Sports ARG",
    logo: "/logos/tyc-sports.svg",
    group: "Argentina",
    streamUrl: "https://1nyaler.streamhostingcdn.top/stream/84/index.m3u8",
  },
];
