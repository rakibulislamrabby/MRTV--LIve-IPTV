import fs from "fs";
import path from "path";

import { parseM3uPlaylist, type Channel } from "./parse-m3u";

export type { Channel };

const PLAYLIST_DIR = path.join(process.cwd(), "data/playlists");

const PLAYLISTS: Array<{
  file: string;
  idPrefix: string;
  featured?: boolean;
  defaultGroup?: string;
}> = [
  {
    file: "Fifa Special By Ariful Tv.m3u",
    idPrefix: "fifa",
    featured: true,
  },
];

let cache: { signature: string; channels: Channel[] } | null = null;

function getPlaylistSignature(): string {
  return PLAYLISTS.map(({ file }) => {
    const filePath = path.join(PLAYLIST_DIR, file);
    if (!fs.existsSync(filePath)) return `${file}:missing`;
    return `${file}:${fs.statSync(filePath).mtimeMs}`;
  }).join("|");
}

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
  const signature = getPlaylistSignature();
  if (cache?.signature === signature) {
    return cache.channels;
  }

  const channels: Channel[] = [];

  for (const playlist of PLAYLISTS) {
    const filePath = path.join(PLAYLIST_DIR, playlist.file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseM3uPlaylist(content, {
      idPrefix: playlist.idPrefix,
      featuredChannel: playlist.featured ?? false,
      defaultGroup: playlist.defaultGroup,
    });

    if (playlist.featured) {
      const preferred = parsed.find((channel) => channel.name === "Server 1");
      if (preferred) {
        for (const channel of parsed) {
          channel.isFeatured = channel.id === preferred.id;
        }
      }
    }

    channels.push(...parsed);
  }

  cache = { signature, channels };
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
