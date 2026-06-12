import fs from "fs";
import path from "path";

import bundledChannels from "../generated/channels.json";

import { attachLogo, buildLogoLookup } from "./logos";
import {
  isSportsChannel,
  normalizeChannelName,
  parseM3U,
  sortChannels,
} from "./m3u";
import type { Channel, ChannelSource } from "./types";

const SKY_PLAYLIST = "Skym3u-176.m3u";
const AYNA_PLAYLIST = "aynaott.m3u";
const GENERATED_CHANNELS = path.join(process.cwd(), "generated/channels.json");

const EXTRA_SPORTS_PLAYLISTS: Array<{
  file: string;
  source: ChannelSource;
  sportsOnly: boolean;
}> = [
  { file: "fifa-wrold-cupm3u", source: "sports-fifa-wc", sportsOnly: false },
  { file: "4-Update-New.m3u", source: "sports-new", sportsOnly: true },
];

function getPlaylistDir(): string {
  return path.join(process.cwd(), "data/playlists");
}

function isPlaylistFile(filename: string): boolean {
  return filename.endsWith(".m3u") || filename === "fifa-wrold-cupm3u";
}

function listPlaylistFiles(): string[] {
  return fs.readdirSync(getPlaylistDir()).filter(isPlaylistFile);
}

function readPlaylist(filename: string): string {
  return fs.readFileSync(path.join(getPlaylistDir(), filename), "utf-8");
}

function getPlaylistMtime(): number {
  const playlistDir = getPlaylistDir();
  const files = listPlaylistFiles();
  if (files.length === 0) return 0;
  return Math.max(
    ...files.map((file) => fs.statSync(path.join(playlistDir, file)).mtimeMs),
  );
}

function buildSkyFallbackMap(channels: Channel[]): Map<string, string> {
  const urlsByName = new Map<string, Set<string>>();

  for (const channel of channels) {
    const key = normalizeChannelName(channel.name);
    const urls = urlsByName.get(key) ?? new Set<string>();
    urls.add(channel.url);
    urlsByName.set(key, urls);
  }

  // Ambiguous channel names in fallback playlists can map to wrong streams.
  // Only keep fallback URLs for names that point to exactly one upstream URL.
  const fallbacks = new Map<string, string>();
  for (const [key, urls] of urlsByName) {
    if (urls.size !== 1) continue;
    const [url] = [...urls];
    if (url) {
      fallbacks.set(key, url);
    }
  }

  return fallbacks;
}

function attachFallback(channel: Channel, fallbacks: Map<string, string>): Channel {
  const fallbackUrl = fallbacks.get(normalizeChannelName(channel.name));
  return {
    ...channel,
    fallbackUrl:
      fallbackUrl && fallbackUrl !== channel.url ? fallbackUrl : undefined,
  };
}

function parseExtraSportsPlaylists(): Channel[] {
  const channels: Channel[] = [];

  for (const playlist of EXTRA_SPORTS_PLAYLISTS) {
    const playlistPath = path.join(getPlaylistDir(), playlist.file);
    if (!fs.existsSync(playlistPath)) continue;

    let parsed = parseM3U(readPlaylist(playlist.file), playlist.source).filter(
      (channel) => channel.group === "Sports",
    );

    if (playlist.sportsOnly) {
      parsed = parsed.filter((channel) => isSportsChannel(channel.name));
    }

    channels.push(...parsed);
  }

  return channels;
}

function isPtvChannel(channel: Pick<Channel, "name">): boolean {
  return /ptv/i.test(channel.name);
}

export function buildChannelList(): Channel[] {
  const aynaChannels = parseM3U(readPlaylist(AYNA_PLAYLIST), "aynaott");
  const skyChannels = parseM3U(readPlaylist(SKY_PLAYLIST), "sky");
  const extraSportsChannels = parseExtraSportsPlaylists();
  const skyFallbacks = buildSkyFallbackMap(skyChannels);
  const logoLookup = buildLogoLookup(aynaChannels);

  const baseChannels = aynaChannels.map((channel) =>
    attachFallback(channel, skyFallbacks),
  );
  const knownUrls = new Set(baseChannels.map((channel) => channel.url));
  const extraChannels = extraSportsChannels
    .filter((channel) => {
      if (isPtvChannel(channel)) return true;
      return !knownUrls.has(channel.url);
    })
    .map((channel) => attachFallback(channel, skyFallbacks))
    .map((channel) => attachLogo(channel, logoLookup));

  return sortChannels([...baseChannels, ...extraChannels]);
}

let memoryCache: { mtime: number; channels: Channel[] } | null = null;

function readGeneratedChannels(): Channel[] | null {
  if (!fs.existsSync(GENERATED_CHANNELS)) return null;

  const generatedMtime = fs.statSync(GENERATED_CHANNELS).mtimeMs;
  if (generatedMtime < getPlaylistMtime()) return null;

  return JSON.parse(fs.readFileSync(GENERATED_CHANNELS, "utf-8")) as Channel[];
}

function readBundledChannels(): Channel[] {
  return sortChannels((bundledChannels as Channel[]).map((channel) => ({ ...channel })));
}

function readProductionChannels(): Channel[] {
  const bundled = readBundledChannels();
  if (bundled.length > 0) {
    return bundled;
  }

  if (fs.existsSync(GENERATED_CHANNELS)) {
    return sortChannels(
      JSON.parse(fs.readFileSync(GENERATED_CHANNELS, "utf-8")) as Channel[],
    );
  }

  return buildChannelList();
}

export function getChannels(): Channel[] {
  if (process.env.NODE_ENV === "production") {
    return readProductionChannels();
  }

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

export function getChannelById(id: string): Channel | null {
  return getChannels().find((channel) => channel.id === id) ?? null;
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
    groups[group] = sortChannels(groups[group]);
  }

  return groups;
}
