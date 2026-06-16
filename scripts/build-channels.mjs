import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { pinFeaturedChannel } from "../lib/featured-channel.mjs";
import { parseFifaPlaylistContent } from "../lib/fifa-playlist.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const playlistPath = path.join(root, "data/playlists/fifa-channel.m3u");
const outputPath = path.join(root, "generated/channels.json");

function groupSortIndex(group) {
  const priority = [
    "Sports",
    "Live Sports",
    "Argentina",
    "Mexico",
    "USA",
    "Latino",
    "ESPN",
    "Fox",
    "beIN",
    "DAZN",
    "Sky",
    "Eastern Europe",
  ];
  const index = priority.indexOf(group);
  return index === -1 ? priority.length : index;
}

function sortChannels(channels) {
  return [...channels].sort((a, b) => {
    const groupDiff = groupSortIndex(a.group) - groupSortIndex(b.group);
    if (groupDiff !== 0) return groupDiff;

    const logoDiff = Number(Boolean(b.logo)) - Number(Boolean(a.logo));
    if (logoDiff !== 0) return logoDiff;

    return a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
      numeric: true,
    });
  });
}

function isBuildUpToDate() {
  if (process.env.FORCE_CHANNELS_BUILD === "1") return false;
  if (!fs.existsSync(outputPath) || !fs.existsSync(playlistPath)) return false;

  const playlistMtime = fs.statSync(playlistPath).mtimeMs;
  const channelsMtime = fs.statSync(outputPath).mtimeMs;

  return channelsMtime >= playlistMtime;
}

if (isBuildUpToDate()) {
  const existing = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
  console.log(
    `Channels up to date (${existing.length} channels), skipping build.`,
  );
  process.exit(0);
}

const content = fs.readFileSync(playlistPath, "utf-8");
const channels = pinFeaturedChannel(sortChannels(parseFifaPlaylistContent(content)));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(channels));
console.log(`\nGenerated ${channels.length} channels from fifa-channel.m3u`);
