"use client";

import { useEffect, useRef, useState } from "react";

import {
  HLS_CONFIG,
  preloadHls,
  STREAM_TIMEOUT_MS,
  type HlsInstance,
} from "@/lib/hls-loader";
import type { Channel, ChannelSource } from "@/lib/types";

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

interface VideoPlayerProps {
  channel: Channel | null;
}

export function VideoPlayer({ channel }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "error">(
    "idle",
  );
  const [activeSource, setActiveSource] = useState<ChannelSource>("aynaott");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void preloadHls();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel) {
      setStatus("idle");
      setErrorMessage(null);
      setActiveSource("aynaott");
      return;
    }

    let cancelled = false;

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

        const onNativeError = () => finish(false);

        const onNativePlaying = () => {
          video.removeEventListener("playing", onNativePlaying);
          video.removeEventListener("error", onNativeError);
          if (!cancelled) setStatus("playing");
          finish(true);
        };

        if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
          video.addEventListener("playing", onNativePlaying, { once: true });
          video.addEventListener("error", onNativeError, { once: true });
          video.src = url;
          void video.play().catch(() => finish(false));
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
              hls.loadSource(url);
              hls.attachMedia(video);

              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                void video.play().catch(() => finish(false));
              });

              hls.on(Hls.Events.ERROR, () => finish(false));
              video.addEventListener("playing", onNativePlaying, { once: true });
            })
            .catch(() => finish(false));
          return;
        }

        video.addEventListener("playing", onNativePlaying, { once: true });
        video.addEventListener("error", onNativeError, { once: true });
        video.src = url;
        void video.play().catch(() => finish(false));
      });

    const startPlayback = async () => {
      setStatus("loading");
      setErrorMessage(null);
      setActiveSource("aynaott");

      const primaryOk = await playUrl(channel.url);
      if (cancelled) return;
      if (primaryOk) return;

      if (channel.fallbackUrl) {
        setActiveSource("sky");
        const fallbackOk = await playUrl(channel.fallbackUrl);
        if (cancelled) return;
        if (fallbackOk) return;
      }

      setStatus("error");
      setErrorMessage("Stream unavailable on AynaOTT and Sky backup.");
    };

    void startPlayback();

    return () => {
      cancelled = true;
      destroyHls(hlsRef);
    };
  }, [channel]);

  const isLoading = status === "loading";

  return (
    <div className="player-shell">
      <div className="player-frame">
        {channel ? (
          <>
            <video
              ref={videoRef}
              className={`player-video ${isLoading ? "player-video-loading" : ""}`}
              controls={!isLoading}
              playsInline
              autoPlay
              preload="none"
            />
            {isLoading && (
              <div className="player-overlay">
                <span className="player-spinner" />
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
            <div className="player-placeholder-icon">▶</div>
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
