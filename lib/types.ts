export type ChannelSource =
  | "fifa-channel"
  | "sky"
  | "aynaott"
  | "sports"
  | "sports-fifa-wc"
  | "sports-new";

export interface Channel {
  id: string;
  name: string;
  url: string;
  fallbackUrl?: string;
  logo?: string;
  group: string;
  source: ChannelSource;
}
