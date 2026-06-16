import fs from "fs";
import path from "path";

import bundledChannels from "../generated/channels.json";

import { pinFeaturedChannel } from "./featured-channel";
import { parseFifaPlaylist } from "./fifa-playlist";
import { sortChannels } from "./m3u";
import type { Channel } from "./types";

const FIFA_PLAYLIST = "fifa-channel.m3u";
const GENERATED_CHANNELS = path.join(process.cwd(), "generated/channels.json");

function getPlaylistPath(): string {
  return path.join(process.cwd(), "data/playlists", FIFA_PLAYLIST);
}

function getPlaylistMtime(): number {
  const playlistPath = getPlaylistPath();
  if (!fs.existsSync(playlistPath)) return 0;
  return fs.statSync(playlistPath).mtimeMs;
}

export function buildChannelList(): Channel[] {
  const playlistPath = getPlaylistPath();
  if (!fs.existsSync(playlistPath)) {
    return [];
  }

  const content = fs.readFileSync(playlistPath, "utf-8");
  return pinFeaturedChannel(sortChannels(parseFifaPlaylist(content)));
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
