"use client";

import { useEffect, useRef, useState } from "react";

import {
  getBannerAdForPlacement,
  loadBannerAd,
  MOBILE_BANNER_QUERY,
} from "@/lib/ads";

function scheduleBannerLoad(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 2500 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, 400);
  return () => window.clearTimeout(id);
}

interface AdBannerProps {
  /** Header = below nav (desktop). Footer = below channel list (mobile). */
  placement?: "header" | "footer";
}

export function AdBanner({ placement = "header" }: AdBannerProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_BANNER_QUERY);
    const updateViewport = () => setIsMobile(media.matches);

    updateViewport();
    media.addEventListener("change", updateViewport);

    return () => media.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  const config = getBannerAdForPlacement(placement, isMobile);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot || !isVisible || !config) return;

    if (slot.dataset.bannerKey === config.key && slot.childElementCount > 0) {
      return;
    }

    let cancelled = false;
    const cancelScheduledLoad = scheduleBannerLoad(() => {
      if (cancelled) return;
      loadBannerAd(slot, config);
    });

    return () => {
      cancelled = true;
      cancelScheduledLoad();
    };
  }, [config, isVisible]);

  if (!config) {
    return null;
  }

  return (
    <div
      className={`ad-banner ad-banner-${placement} ${
        isMobile ? "ad-banner-mobile" : "ad-banner-desktop"
      }`}
      aria-label="Advertisement"
    >
      <div
        ref={slotRef}
        id={`ad-banner-${config.key}`}
        className="ad-banner-slot"
        style={{
          width: config.width,
          minHeight: config.height,
        }}
      />
    </div>
  );
}
