import {
  HLS_CONFIG,
  preloadHls,
  STREAM_TIMEOUT_MS,
  type HlsInstance,
} from "./hls-loader";
import type { Channel } from "./types";

const PROBE_TIMEOUT_MS = Math.min(STREAM_TIMEOUT_MS, 9000);

function probeUrl(url: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(true);
  if (url.endsWith(".mpd")) return Promise.resolve(false);

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    let settled = false;
    let hls: HlsInstance | null = null;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.pause();
      video.removeAttribute("src");
      video.load();
      hls?.destroy();
      resolve(ok);
    };

    const timer = window.setTimeout(() => finish(false), PROBE_TIMEOUT_MS);
    const isHls = url.includes(".m3u8");

    const onPlaying = () => finish(true);
    const onError = () => finish(false);

    video.addEventListener("playing", onPlaying, { once: true });
    video.addEventListener("error", onError, { once: true });

    if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      void video.play().catch(() => finish(false));
      return;
    }

    if (isHls) {
      void preloadHls()
        .then((Hls) => {
          if (!Hls.isSupported()) {
            finish(false);
            return;
          }

          hls = new Hls({ ...HLS_CONFIG, maxBufferLength: 4, maxMaxBufferLength: 8 });
          hls.attachMedia(video);
          hls.loadSource(url);

          hls.on(Hls.Events.MANIFEST_PARSED, () => finish(true));
          hls.on(Hls.Events.ERROR, (...args: unknown[]) => {
            const data = args[1] as { fatal?: boolean } | undefined;
            if (data?.fatal) finish(false);
          });
        })
        .catch(() => finish(false));
      return;
    }

    video.src = url;
    void video.play().catch(() => finish(false));
  });
}

export async function probeChannel(channel: Channel): Promise<boolean> {
  if (await probeUrl(channel.url)) return true;
  if (channel.fallbackUrl && (await probeUrl(channel.fallbackUrl))) return true;
  return false;
}
