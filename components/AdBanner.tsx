"use client";

import { useEffect, useRef, useState } from "react";

import {
  getBannerAdForViewport,
  MOBILE_BANNER_QUERY,
  type BannerAdConfig,
} from "@/lib/ads";

function loadBanner(slot: HTMLDivElement, config: BannerAdConfig): void {
  slot.replaceChildren();
  slot.dataset.bannerKey = config.key;

  window.atOptions = {
    key: config.key,
    format: "iframe",
    height: config.height,
    width: config.width,
    params: {},
  };

  const script = document.createElement("script");
  script.src = config.script;
  script.async = true;
  script.dataset.adsterraBanner = config.key;
  slot.appendChild(script);
}

export function AdBanner() {
  const slotRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

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

    const config = getBannerAdForViewport(isMobile);
    if (slot.dataset.bannerKey === config.key && slot.childElementCount > 0) {
      return;
    }

    loadBanner(slot, config);
  }, [isMobile]);

  const config = getBannerAdForViewport(isMobile);

  return (
    <div
      className={`ad-banner ${isMobile ? "ad-banner-mobile" : "ad-banner-desktop"}`}
      aria-label="Advertisement"
    >
      <div
        ref={slotRef}
        id={`adsterra-banner-${config.key}`}
        className="ad-banner-slot"
        style={{
          width: config.width,
          minHeight: config.height,
        }}
      />
    </div>
  );
}
