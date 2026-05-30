import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const outputPath = path.join(root, "generated/channels.json");

function normalizeChannelName(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseExtInf(line) {
  const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
  const groupMatch = line.match(/group-title="([^"]*)"/i);
  const commaIndex = line.lastIndexOf(",");
  const name =
    commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : "Unknown Channel";

  return {
    name,
    logo: logoMatch?.[1] || undefined,
    group: groupMatch?.[1] || undefined,
  };
}

function isStreamUrl(line) {
  return /^https?:\/\//i.test(line) || line.endsWith(".m3u8") || line.endsWith(".mpd");
}

function parseM3U(content, source) {
  const lines = content.split(/\r?\n/);
  const channels = [];
  let pending = null;
  const usedIds = new Set();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === "#EXTM3U") continue;

    if (line.startsWith("#EXTINF:")) {
      pending = parseExtInf(line);
      continue;
    }

    if (pending && isStreamUrl(line)) {
      const defaultGroup = source === "sky" ? "Sky Channels" : "Other";
      const group = pending.group?.trim() || defaultGroup;
      const baseId = `${source}-${slugify(pending.name)}`;
      let id = baseId;
      let suffix = 1;

      while (usedIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }

      usedIds.add(id);
      channels.push({
        id,
        name: pending.name,
        url: line,
        logo: pending.logo,
        group,
        source,
      });
      pending = null;
    }
  }

  return channels;
}

function buildChannelList() {
  const aynaContent = fs.readFileSync(path.join(publicDir, "aynaott.m3u"), "utf-8");
  const skyContent = fs.readFileSync(path.join(publicDir, "Skym3u-176.m3u"), "utf-8");
  const aynaChannels = parseM3U(aynaContent, "aynaott");
  const skyChannels = parseM3U(skyContent, "sky");
  const skyFallbacks = new Map();

  for (const channel of skyChannels) {
    const key = normalizeChannelName(channel.name);
    if (!skyFallbacks.has(key)) {
      skyFallbacks.set(key, channel.url);
    }
  }

  return aynaChannels.map((channel) => {
    const fallbackUrl = skyFallbacks.get(normalizeChannelName(channel.name));

    return {
      ...channel,
      fallbackUrl:
        fallbackUrl && fallbackUrl !== channel.url ? fallbackUrl : undefined,
    };
  });
}

const channels = buildChannelList();
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(channels));
console.log(`Generated ${channels.length} channels -> generated/channels.json`);
