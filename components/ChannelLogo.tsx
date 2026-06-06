"use client";

import { useState } from "react";

interface ChannelLogoProps {
  name: string;
  logo?: string;
  className: string;
  fallbackClassName?: string;
}

export function ChannelLogo({
  name,
  logo,
  className,
  fallbackClassName,
}: ChannelLogoProps) {
  const [failed, setFailed] = useState(false);

  if (!logo || failed) {
    return (
      <div className={fallbackClassName ?? `${className} channel-logo-fallback`}>
        {name.charAt(0)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt=""
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
