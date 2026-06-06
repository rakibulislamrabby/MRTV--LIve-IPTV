"use client";

import { CircleDot } from "lucide-react";
import { memo } from "react";

import type { Channel } from "@/lib/types";

import { ChannelLogo } from "./ChannelLogo";
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
        <ChannelLogo
          name={channel.name}
          logo={channel.logo}
          className="channel-logo"
          fallbackClassName="channel-logo channel-logo-fallback"
        />
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
