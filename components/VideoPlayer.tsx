"use client";

import { Loader2, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  HLS_CONFIG,
  isHlsPlaybackUrl,
  preloadHls,
  STREAM_TIMEOUT_MS,
  type HlsInstance,
} from "@/lib/hls-loader";
import type { ClientChannel } from "@/lib/client-channel";

import { ChannelLogo } from "./ChannelLogo";
import { AppIcon } from "./icons";

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

interface VideoPlayerProps {
  channel: ClientChannel | null;
  playbackKey: number;
}

export function VideoPlayer({ channel, playbackKey }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel) {
      setStatus("idle");
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    const url = channel.streamUrl;

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

      destroyHls(hlsRef);
      resetVideo(video);

      const isHls = isHlsPlaybackUrl(url);
      const timeoutId = window.setTimeout(() => {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage("This stream is unavailable right now.");
        }
      }, STREAM_TIMEOUT_MS);

      const markPlaying = () => {
        if (!cancelled) {
          window.clearTimeout(timeoutId);
          setStatus("playing");
        }
      };

      const markError = () => {
        if (!cancelled) {
          window.clearTimeout(timeoutId);
          setStatus("error");
          setErrorMessage("This stream is unavailable right now.");
        }
      };

      const attemptPlay = async () => {
        const played = await forcePlay(video);
        if (played) markPlaying();
      };

      video.addEventListener("playing", markPlaying, { once: true });
      video.addEventListener("error", markError, { once: true });

      if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        void attemptPlay();
        return;
      }

      if (isHls) {
        try {
          const Hls = await preloadHls();
          if (cancelled || !Hls.isSupported()) {
            markError();
            return;
          }

          const hls = new Hls(HLS_CONFIG);
          hlsRef.current = hls;
          hls.attachMedia(video);
          hls.loadSource(url);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            void attemptPlay();
          });

          hls.on(Hls.Events.ERROR, (...args: unknown[]) => {
            const data = args[1] as { fatal?: boolean } | undefined;
            if (data?.fatal) markError();
          });
        } catch {
          markError();
        }
        return;
      }

      video.src = url;
      void attemptPlay();
    };

    void startPlayback();

    return () => {
      cancelled = true;
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
                <p>Wait some moment…</p>
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
            <ChannelLogo
              name={channel.name}
              logo={channel.logo}
              className="player-channel-logo"
              fallbackClassName="player-channel-logo player-channel-logo-fallback"
            />
            <div>
              <h2>{channel.name}</h2>
              <p>{channel.group}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
