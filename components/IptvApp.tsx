"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { triggerPopunderAd } from "@/lib/ads";
import { preloadHls } from "@/lib/hls-loader";
import type { Channel } from "@/lib/types";

import { AdBanner } from "./AdBanner";
import { ChannelItem } from "./ChannelItem";
import { VideoPlayer } from "./VideoPlayer";

interface IptvAppProps {
  channels: Channel[];
}

function sortGroups(groups: string[]): string[] {
  const priority = ["Bangla", "Sports", "News", "Entertainment", "Kids"];

  return [...groups].sort((a, b) => {
    const aIndex = priority.indexOf(a);
    const bIndex = priority.indexOf(b);

    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }

    return a.localeCompare(b);
  });
}

export function IptvApp({ channels }: IptvAppProps) {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("All");
  const [panelOpen, setPanelOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  useEffect(() => {
    void preloadHls();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSelectedChannel((current) => current ?? channels[0] ?? null);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [channels]);

  const groups = useMemo(() => {
    const unique = new Set(channels.map((channel) => channel.group));
    return sortGroups([...unique]);
  }, [channels]);

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const channel of channels) {
      counts.set(channel.group, (counts.get(channel.group) ?? 0) + 1);
    }
    return counts;
  }, [channels]);

  const backupCount = useMemo(
    () => channels.reduce((count, channel) => count + (channel.fallbackUrl ? 1 : 0), 0),
    [channels],
  );

  const filteredChannels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return channels.filter((channel) => {
      const matchesGroup =
        activeGroup === "All" || channel.group === activeGroup;
      const matchesSearch =
        !query ||
        channel.name.toLowerCase().includes(query) ||
        channel.group.toLowerCase().includes(query);

      return matchesGroup && matchesSearch;
    });
  }, [activeGroup, channels, searchQuery]);

  const handleSelectChannel = useCallback((channel: Channel) => {
    triggerPopunderAd();
    setSelectedChannel(channel);
    setPanelOpen(false);
  }, []);

  const handleSelectGroup = useCallback((group: string) => {
    triggerPopunderAd();
    setActiveGroup(group);
    setCategoriesOpen(false);
  }, []);

  const handleTogglePanel = useCallback(() => {
    triggerPopunderAd();
    setPanelOpen((open) => !open);
  }, []);

  const handleToggleCategories = useCallback(() => {
    triggerPopunderAd();
    setCategoriesOpen((open) => !open);
  }, []);

  const handleClosePanel = useCallback(() => {
    triggerPopunderAd();
    setPanelOpen(false);
  }, []);

  return (
    <div className="iptv-app">
      <header className="iptv-header">
        <div className="iptv-header-left">
          <button
            type="button"
            className="menu-button lg-hidden"
            onClick={handleTogglePanel}
            aria-label="Toggle channel panel"
          >
            ☰
          </button>
          <div>
            <p className="iptv-kicker">Live IPTV</p>
            <h1>MR TV</h1>
          </div>
        </div>

        <div className="iptv-search-wrap">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search channels…"
            className="iptv-search"
          />
        </div>

        <div className="iptv-stats">
          <span>{channels.length} channels</span>
          <span className="stat-divider">·</span>
          <span>{backupCount} Sky backups</span>
        </div>
      </header>

      <AdBanner />

      <div className="iptv-layout">
        <main className="iptv-main">
          <VideoPlayer channel={selectedChannel} />
        </main>

        {panelOpen && (
          <button
            type="button"
            className="panel-backdrop lg-hidden"
            aria-label="Close channel panel"
            onClick={handleClosePanel}
          />
        )}

        <aside className={`iptv-panel ${panelOpen ? "iptv-panel-open" : ""}`}>
          <div className="panel-top">
            <div className="panel-heading">
              <h2>Channels</h2>
              <span className="panel-count">{filteredChannels.length}</span>
            </div>

            <button
              type="button"
              className={`category-toggle ${categoriesOpen ? "open" : ""}`}
              onClick={handleToggleCategories}
              aria-expanded={categoriesOpen}
            >
              <span className="category-toggle-label">
                <span className="category-toggle-title">Categories</span>
                {activeGroup !== "All" && (
                  <span className="category-active-pill">{activeGroup}</span>
                )}
              </span>
              <span className="category-toggle-chevron" aria-hidden="true">
                {categoriesOpen ? "▲" : "▼"}
              </span>
            </button>

            <div
              className={`category-drawer ${categoriesOpen ? "category-drawer-open" : ""}`}
            >
              <div className="category-list">
                <button
                  type="button"
                  className={`category-chip ${activeGroup === "All" ? "active" : ""}`}
                  onClick={() => handleSelectGroup("All")}
                >
                  All
                  <span>{channels.length}</span>
                </button>
                {groups.map((group) => (
                  <button
                    key={group}
                    type="button"
                    className={`category-chip ${activeGroup === group ? "active" : ""}`}
                    onClick={() => handleSelectGroup(group)}
                  >
                    {group}
                    <span>{groupCounts.get(group) ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ul className="channel-list">
            {filteredChannels.length === 0 ? (
              <li className="channel-empty">No channels match your search.</li>
            ) : (
              filteredChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isActive={selectedChannel?.id === channel.id}
                  onSelect={handleSelectChannel}
                />
              ))
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
