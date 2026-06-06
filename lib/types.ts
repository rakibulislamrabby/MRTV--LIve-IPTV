export type ChannelSource = "sky" | "aynaott" | "sports";

export interface Channel {
  id: string;
  name: string;
  url: string;
  fallbackUrl?: string;
  logo?: string;
  group: string;
  source: ChannelSource;
}
