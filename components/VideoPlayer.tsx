"use client";

import { Loader2, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  HLS_CONFIG,
  preloadHls,
  STREAM_TIMEOUT_MS,
  type HlsInstance,
} from "@/lib/hls-loader";
import type { Channel, ChannelSource } from "@/lib/types";

import { AppIcon } from "./icons";

const MAX_AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 700;
const PLAY_WATCHDOG_MS = 5000;
const PLAY_WATCHDOG_INTERVAL_MS = 400;

function destroyHls(hlsRef: React.RefObject<HlsInstance | null>) {
  if (hlsRef.current) {
    hlsRef.current.destroy();
    hlsRef.current = null;
  }
}

function resetVideo(video: HTMLVideoElement) {
  video.pause();
  video.removeAttribute("src");
  video.load();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function forcePlay(video: HTMLVideoElement): Promise<boolean> {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;

  try {
    await video.play();
    return !video.paused;
  } catch {
    return false;
  }
}

function startPlayWatchdog(
  video: HTMLVideoElement,
  isCancelled: () => boolean,
): () => void {
  const startedAt = Date.now();

  const intervalId = window.setInterval(() => {
    if (isCancelled() || Date.now() - startedAt > PLAY_WATCHDOG_MS) {
      window.clearInterval(intervalId);
      return;
    }

    if (video.paused && video.readyState >= 2) {
      void forcePlay(video);
    }
  }, PLAY_WATCHDOG_INTERVAL_MS);

  return () => window.clearInterval(intervalId);
}

interface VideoPlayerProps {
  channel: Channel | null;
  playbackKey: number;
}

export function VideoPlayer({ channel, playbackKey }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "error">(
    "idle",
  );
  const [activeSource, setActiveSource] = useState<ChannelSource>("aynaott");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel) {
      setStatus("idle");
      setErrorMessage(null);
      setActiveSource("aynaott");
      return;
    }

    let cancelled = false;
    let stopWatchdog = () => {};

    const isCancelled = () => cancelled;

    const markPlaying = () => {
      if (!cancelled) {
        setStatus("playing");
      }
    };

    const playUrl = (url: string): Promise<boolean> =>
      new Promise((resolve) => {
        if (cancelled) {
          resolve(false);
          return;
        }

        let settled = false;
        const finish = (success: boolean) => {
          if (settled || cancelled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          stopWatchdog();
          resolve(success);
        };

        const timeoutId = window.setTimeout(
          () => finish(false),
          STREAM_TIMEOUT_MS,
        );

        destroyHls(hlsRef);
        resetVideo(video);

        const isHls = url.includes(".m3u8");
        const isDash = url.endsWith(".mpd");

        if (isDash) {
          finish(false);
          return;
        }

        const onNativePlaying = () => {
          markPlaying();
          finishWithCleanup(true);
        };

        const onNativeError = () => finishWithCleanup(false);

        const onCanPlay = () => {
          if (!video.paused) return;
          void attemptPlay();
        };

        const cleanupListeners = () => {
          video.removeEventListener("playing", onNativePlaying);
          video.removeEventListener("error", onNativeError);
          video.removeEventListener("canplay", onCanPlay);
        };

        const finishWithCleanup = (success: boolean) => {
          cleanupListeners();
          finish(success);
        };

        const attemptPlay = async () => {
          const played = await forcePlay(video);
          if (played) {
            markPlaying();
            finishWithCleanup(true);
          }
        };

        video.addEventListener("playing", onNativePlaying);
        video.addEventListener("error", onNativeError, { once: true });
        video.addEventListener("canplay", onCanPlay);

        stopWatchdog = startPlayWatchdog(video, isCancelled);

        if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
          void attemptPlay();
          return;
        }

        if (isHls) {
          void preloadHls()
            .then((Hls) => {
              if (cancelled || !Hls.isSupported()) {
                finish(false);
                return;
              }

              const hls = new Hls(HLS_CONFIG);
              hlsRef.current = hls;
              hls.attachMedia(video);
              hls.loadSource(url);

              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                void attemptPlay();
              });

              hls.on(Hls.Events.ERROR, () => {
                if (!video.paused) return;
                void attemptPlay();
              });
            })
            .catch(() => finish(false));

          return;
        }

        video.src = url;
        void attemptPlay();
      });

    const trySources = async (): Promise<boolean> => {
      setActiveSource("aynaott");
      const primaryOk = await playUrl(channel.url);
      if (cancelled) return false;
      if (primaryOk) return true;

      if (channel.fallbackUrl) {
        setActiveSource("sky");
        const fallbackOk = await playUrl(channel.fallbackUrl);
        if (cancelled) return false;
        if (fallbackOk) return true;
      }

      return false;
    };

    const startPlayback = async () => {
      setStatus("loading");
      setErrorMessage(null);

      try {
        await preloadHls();
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage("Failed to initialize the video player.");
        }
        return;
      }

      if (cancelled) return;

      for (let attempt = 0; attempt <= MAX_AUTO_RETRIES; attempt += 1) {
        if (cancelled) return;

        if (attempt > 0) {
          await wait(RETRY_DELAY_MS);
          if (cancelled) return;
        }

        const ok = await trySources();
        if (cancelled) return;
        if (ok) return;
      }

      if (!cancelled) {
        setStatus("error");
        setErrorMessage("Stream unavailable on AynaOTT and Sky backup.");
      }
    };

    void startPlayback();

    return () => {
      cancelled = true;
      stopWatchdog();
      destroyHls(hlsRef);
    };
  }, [channel, playbackKey]);

  const isLoading = status === "loading";

  return (
    <div className="player-shell">
      <div className="player-frame">
        {channel ? (
          <>
            <video
              ref={videoRef}
              className={`player-video ${isLoading ? "player-video-loading" : ""}`}
              controls
              playsInline
              autoPlay
              muted
              preload="auto"
            />
            {isLoading && (
              <div className="player-overlay">
                <AppIcon
                  icon={Loader2}
                  size={40}
                  className="player-spinner-icon"
                />
                <p>
                  {activeSource === "sky"
                    ? "Trying Sky backup…"
                    : "Loading stream…"}
                </p>
              </div>
            )}
            {status === "error" && (
              <div className="player-overlay player-overlay-error">
                <p>{errorMessage ?? "Playback failed"}</p>
              </div>
            )}
          </>
        ) : (
          <div className="player-placeholder">
            <div className="player-placeholder-icon">
              <AppIcon icon={Play} size={28} />
            </div>
            <p>Select a channel to start watching</p>
          </div>
        )}
      </div>

      {channel && (
        <div className="player-meta">
          <div className="player-meta-main">
            {channel.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={channel.logo}
                alt=""
                className="player-channel-logo"
                decoding="async"
              />
            ) : (
              <div className="player-channel-logo player-channel-logo-fallback">
                {channel.name.charAt(0)}
              </div>
            )}
            <div>
              <h2>{channel.name}</h2>
              <p>
                {channel.group} ·{" "}
                <span className={`source-badge source-${activeSource}`}>
                  {activeSource === "sky" ? "Sky backup" : "AynaOTT"}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
