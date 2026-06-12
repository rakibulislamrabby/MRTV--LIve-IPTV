import { getStreamPath, type ClientChannel } from "./client-channel";

const PROBE_TIMEOUT_MS = 4_500;

async function probeManifest(url: string): Promise<boolean> {
  if (typeof window === "undefined") return true;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) return false;

    const sample = (await response.text()).slice(0, 2048);
    return (
      sample.includes("#EXTM3U") ||
      sample.includes("#EXTINF") ||
      sample.includes("#EXT-X-STREAM-INF")
    );
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function probeChannel(channel: ClientChannel): Promise<boolean> {
  if (await probeManifest(getStreamPath(channel.id))) return true;
  if (channel.hasBackup && (await probeManifest(getStreamPath(channel.id, true)))) {
    return true;
  }
  return false;
}
