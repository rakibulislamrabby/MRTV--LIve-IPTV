export type HlsInstance = {
  destroy: () => void;
  loadSource: (url: string) => void;
  attachMedia: (element: HTMLMediaElement) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

export type HlsConstructor = {
  isSupported: () => boolean;
  Events: { MANIFEST_PARSED: string; ERROR: string };
  new (config?: Record<string, unknown>): HlsInstance;
};

declare global {
  interface Window {
    Hls?: HlsConstructor;
  }
}

const HLS_SCRIPT =
  "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";

let hlsPromise: Promise<HlsConstructor> | null = null;

export function preloadHls(): Promise<HlsConstructor> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("HLS is only available in the browser"));
  }

  if (window.Hls) {
    return Promise.resolve(window.Hls);
  }

  if (hlsPromise) return hlsPromise;

  hlsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-hls-player="true"]',
    );

    if (existing) {
      existing.addEventListener("load", () => {
        if (window.Hls) resolve(window.Hls);
        else reject(new Error("Failed to load HLS.js"));
      });
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load HLS.js")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = HLS_SCRIPT;
    script.async = true;
    script.dataset.hlsPlayer = "true";
    script.onload = () => {
      if (window.Hls) resolve(window.Hls);
      else reject(new Error("Failed to load HLS.js"));
    };
    script.onerror = () => reject(new Error("Failed to load HLS.js"));
    document.head.appendChild(script);
  });

  return hlsPromise;
}

export const HLS_CONFIG = {
  enableWorker: true,
  lowLatencyMode: true,
  maxBufferLength: 12,
  maxMaxBufferLength: 30,
  startFragPrefetch: true,
};

export const STREAM_TIMEOUT_MS = 6000;
