import fs from "fs";
import path from "path";

import { normalizeChannelName, parseM3U } from "./m3u";
import type { Channel } from "./types";

const SKY_PLAYLIST = "Skym3u-176.m3u";
const AYNA_PLAYLIST = "aynaott.m3u";
const GENERATED_CHANNELS = path.join(process.cwd(), "generated/channels.json");

function getPublicDir(): string {
  return path.join(process.cwd(), "public");
}

function readPlaylist(filename: string): string {
  return fs.readFileSync(path.join(getPublicDir(), filename), "utf-8");
}

function getPlaylistMtime(): number {
  const publicDir = getPublicDir();
  return Math.max(
    fs.statSync(path.join(publicDir, SKY_PLAYLIST)).mtimeMs,
    fs.statSync(path.join(publicDir, AYNA_PLAYLIST)).mtimeMs,
  );
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

export function buildChannelList(): Channel[] {
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

let memoryCache: { mtime: number; channels: Channel[] } | null = null;

function readGeneratedChannels(): Channel[] | null {
  if (!fs.existsSync(GENERATED_CHANNELS)) return null;

  const generatedMtime = fs.statSync(GENERATED_CHANNELS).mtimeMs;
  if (generatedMtime < getPlaylistMtime()) return null;

  return JSON.parse(fs.readFileSync(GENERATED_CHANNELS, "utf-8")) as Channel[];
}

export function getChannels(): Channel[] {
  const generated = readGeneratedChannels();
  if (generated) return generated;

  const mtime = getPlaylistMtime();
  if (memoryCache?.mtime === mtime) {
    return memoryCache.channels;
  }

  const channels = buildChannelList();
  memoryCache = { mtime, channels };
  return channels;
}

export function writeGeneratedChannels(): number {
  const channels = buildChannelList();
  fs.mkdirSync(path.dirname(GENERATED_CHANNELS), { recursive: true });
  fs.writeFileSync(GENERATED_CHANNELS, JSON.stringify(channels));
  memoryCache = { mtime: getPlaylistMtime(), channels };
  return channels.length;
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
