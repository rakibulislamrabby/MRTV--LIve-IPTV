"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ClientChannel } from "@/lib/client-channel";

import { ChannelItem } from "./ChannelItem";

const DESKTOP_BREAKPOINT = 1180;
const ITEM_HEIGHT = 58;
const OVERSCAN = 10;

interface ChannelListProps {
  channels: ClientChannel[];
  selectedChannelId: string | null | undefined;
  onSelect: (channel: ClientChannel) => void;
  className?: string;
}

export function ChannelList({
  channels,
  selectedChannelId,
  onSelect,
  className = "channel-list",
}: ChannelListProps) {
  const containerRef = useRef<HTMLUListElement>(null);
  const [useVirtualization, setUseVirtualization] = useState(false);
  const [range, setRange] = useState({ start: 0, end: 40 });

  const updateRange = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const end = Math.min(
      channels.length,
      Math.ceil((scrollTop + height) / ITEM_HEIGHT) + OVERSCAN,
    );

    setRange((current) =>
      current.start === start && current.end === end
        ? current
        : { start, end },
    );
  }, [channels.length]);

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);

    const syncMode = () => {
      const virtual = media.matches && channels.length > 50;
      setUseVirtualization(virtual);
      if (virtual) {
        updateRange();
      }
    };

    syncMode();
    media.addEventListener("change", syncMode);
    return () => media.removeEventListener("change", syncMode);
  }, [channels.length, updateRange]);

  useEffect(() => {
    if (!useVirtualization) return;

    updateRange();
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", updateRange, { passive: true });
    const observer = new ResizeObserver(updateRange);
    observer.observe(container);

    return () => {
      container.removeEventListener("scroll", updateRange);
      observer.disconnect();
    };
  }, [updateRange, useVirtualization, channels]);

  if (channels.length === 0) {
    return (
      <ul ref={containerRef} className={className}>
        <li className="channel-empty">No channels match your search.</li>
      </ul>
    );
  }

  if (!useVirtualization) {
    return (
      <ul ref={containerRef} className={className}>
        {channels.map((channel) => (
          <ChannelItem
            key={channel.id}
            channel={channel}
            isActive={selectedChannelId === channel.id}
            onSelect={onSelect}
          />
        ))}
      </ul>
    );
  }

  const topSpacer = range.start * ITEM_HEIGHT;
  const bottomSpacer = Math.max(0, channels.length - range.end) * ITEM_HEIGHT;
  const visibleChannels = channels.slice(range.start, range.end);

  return (
    <ul ref={containerRef} className={className}>
      {topSpacer > 0 ? (
        <li aria-hidden="true" className="channel-list-spacer" style={{ height: topSpacer }} />
      ) : null}
      {visibleChannels.map((channel) => (
        <ChannelItem
          key={channel.id}
          channel={channel}
          isActive={selectedChannelId === channel.id}
          onSelect={onSelect}
        />
      ))}
      {bottomSpacer > 0 ? (
        <li
          aria-hidden="true"
          className="channel-list-spacer"
          style={{ height: bottomSpacer }}
        />
      ) : null}
    </ul>
  );
}
