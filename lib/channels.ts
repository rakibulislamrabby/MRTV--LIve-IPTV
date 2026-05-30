import fs from "fs";
import path from "path";

import { normalizeChannelName, parseM3U } from "./m3u";
import type { Channel } from "./types";

const SKY_PLAYLIST = "Skym3u-176.m3u";
const AYNA_PLAYLIST = "aynaott.m3u";

function readPlaylist(filename: string): string {
  return fs.readFileSync(path.join(process.cwd(), "public", filename), "utf-8");
}

function buildSkyFallbackMap(channels: Channel[]): Map<string, string> {
  const fallbacks = new Map<string, string>();

  for (const channel of channels) {
    const key = normalizeChannelName(channel.name);
    if (!fallbacks.has(key)) {
      fallbacks.set(key, channel.url);
    }
  }

  return fallbacks;
}

export function getChannels(): Channel[] {
  const aynaChannels = parseM3U(readPlaylist(AYNA_PLAYLIST), "aynaott");
  const skyChannels = parseM3U(readPlaylist(SKY_PLAYLIST), "sky");
  const skyFallbacks = buildSkyFallbackMap(skyChannels);

  return aynaChannels.map((channel) => {
    const fallbackUrl = skyFallbacks.get(normalizeChannelName(channel.name));

    return {
      ...channel,
      fallbackUrl:
        fallbackUrl && fallbackUrl !== channel.url ? fallbackUrl : undefined,
    };
  });
}

export function groupChannelsByCategory(
  channels: Channel[],
): Record<string, Channel[]> {
  const groups: Record<string, Channel[]> = {};

  for (const channel of channels) {
    if (!groups[channel.group]) {
      groups[channel.group] = [];
    }
    groups[channel.group].push(channel);
  }

  for (const group of Object.keys(groups)) {
    groups[group].sort((a, b) => a.name.localeCompare(b.name));
  }

  return groups;
}
