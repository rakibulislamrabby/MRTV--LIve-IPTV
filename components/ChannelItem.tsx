"use client";

import { CircleDot } from "lucide-react";
import { memo } from "react";

import type { Channel } from "@/lib/types";

import { AppIcon } from "./icons";

interface ChannelItemProps {
  channel: Channel;
  isActive: boolean;
  onSelect: (channel: Channel) => void;
}

export const ChannelItem = memo(function ChannelItem({
  channel,
  isActive,
  onSelect,
}: ChannelItemProps) {
  return (
    <li>
      <button
        type="button"
        className={`channel-item ${isActive ? "active" : ""}`}
        onClick={() => onSelect(channel)}
      >
        {channel.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channel.logo}
            alt=""
            className="channel-logo"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="channel-logo channel-logo-fallback">
            {channel.name.charAt(0)}
          </div>
        )}
        <div className="channel-copy">
          <span className="channel-name">{channel.name}</span>
          <span className="channel-meta">
            {channel.group}
            {channel.fallbackUrl && (
              <span className="backup-tag">Backup</span>
            )}
          </span>
        </div>
        {isActive && (
          <AppIcon icon={CircleDot} size={14} className="channel-live-dot" />
        )}
      </button>
    </li>
  );
});
