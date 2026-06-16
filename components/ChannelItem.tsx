"use client";

import { CircleDot } from "lucide-react";
import { memo } from "react";

import type { ClientChannel } from "@/lib/client-channel";

import { ChannelLogo } from "./ChannelLogo";
import { AppIcon } from "./icons";

interface ChannelItemProps {
  channel: ClientChannel;
  isActive: boolean;
  onSelect: (channel: ClientChannel) => void;
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
          <span className="channel-meta">{channel.group}</span>
        </div>
        {isActive && (
          <AppIcon icon={CircleDot} size={14} className="channel-live-dot" />
        )}
      </button>
    </li>
  );
});
