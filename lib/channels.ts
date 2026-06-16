import fs from "fs";
import path from "path";

import { parseM3uPlaylist, type Channel } from "./parse-m3u";

export type { Channel };

const PLAYLIST_PATH = path.join(
  process.cwd(),
  "data/playlists/fifa-channel.m3u8",
);

let cache: { mtime: number; channels: Channel[] } | null = null;

function isPrivateIpStream(url: string): boolean {
  return /^http:\/\/\d{1,3}(\.\d{1,3}){3}/.test(url);
}

function isDatacenterHost(): boolean {
  return process.env.NETLIFY === "true" || process.env.VERCEL === "1";
}

function isHttpsUrl(url: string): boolean {
  return url.startsWith("https://");
}

export function getChannels(): Channel[] {
  if (!fs.existsSync(PLAYLIST_PATH)) {
    return [];
  }

  const mtime = fs.statSync(PLAYLIST_PATH).mtimeMs;
  if (cache?.mtime === mtime) {
    return cache.channels;
  }

  const content = fs.readFileSync(PLAYLIST_PATH, "utf-8");
  const channels = parseM3uPlaylist(content);
  cache = { mtime, channels };
  return channels;
}

export function getChannelById(id: string): Channel | undefined {
  return getChannels().find((channel) => channel.id === id);
}

export function getFeaturedChannel(): Channel | undefined {
  const channels = getChannels();
  if (channels.length === 0) return undefined;

  if (isDatacenterHost()) {
    return channels.find((channel) => isHttpsUrl(channel.url)) ?? channels[0];
  }

  return channels.find((channel) => channel.isFeatured) ?? channels[0];
}

export function getPlaybackUrls(channel: Channel): string[] {
  if (isDatacenterHost() && isPrivateIpStream(channel.url)) {
    return [];
  }

  return [channel.url];
}
