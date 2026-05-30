"use client";

import { useEffect, useRef } from "react";

import { BANNER_AD } from "@/lib/ads";

export function AdBanner() {
  const slotRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot || loadedRef.current) return;

    loadedRef.current = true;

    window.atOptions = {
      key: BANNER_AD.key,
      format: "iframe",
      height: BANNER_AD.height,
      width: BANNER_AD.width,
      params: {},
    };

    const script = document.createElement("script");
    script.src = BANNER_AD.script;
    script.async = true;
    script.dataset.adsterraBanner = "true";
    slot.appendChild(script);
  }, []);

  return (
    <div className="ad-banner" aria-label="Advertisement">
      <div
        ref={slotRef}
        id={`adsterra-banner-${BANNER_AD.key}`}
        className="ad-banner-slot"
      />
    </div>
  );
}
