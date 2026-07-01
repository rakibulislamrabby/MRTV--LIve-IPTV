"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ChevronDown,
  ChevronUp,
  Goal,
  Menu,
  Search,
  Trophy,
} from "lucide-react";

import {
  isButtonClickTarget,
  triggerPopunderAd,
  triggerSmartLink,
} from "@/lib/ads";
import { preloadHls } from "@/lib/hls-loader";
import type { ClientChannel } from "@/lib/client-channel";

import { AdBanner } from "./AdBanner";
import { BrandLogo } from "./BrandLogo";
import { AppIcon } from "./icons";
import { ChannelList } from "./ChannelList";
import { LiveMatchEvents } from "./LiveMatchEvents";
import { VideoPlayer } from "./VideoPlayer";

const GROUP_PRIORITY = ["FIFA", "Sports", "Argentina"];

function sortGroups(groups: string[]): string[] {
  return [...groups].sort((a, b) => {
    const aIndex = GROUP_PRIORITY.indexOf(a);
    const bIndex = GROUP_PRIORITY.indexOf(b);

    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }

    return a.localeCompare(b);
  });
}

export function IptvApp() {
  const [channels, setChannels] = useState<ClientChannel[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<ClientChannel | null>(
    null,
  );
  const [playbackKey, setPlaybackKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("All");
  const [panelOpen, setPanelOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    void preloadHls();

    let cancelled = false;

    void fetch("/api/catalog", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load channels");
        return response.json() as Promise<ClientChannel[]>;
      })
      .then((data) => {
        if (cancelled) return;
        setChannels(data);
        const featured = data.find((channel) => channel.isFeatured);
        setSelectedChannel((current) => current ?? featured ?? data[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setChannels([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToMobileChannels = useCallback(() => {
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

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

  const sportsGroup = useMemo(
    () => groups.find((group) => group.toLowerCase() === "sports") ?? null,
    [groups],
  );

  const firstSportsChannel = useMemo(() => {
    if (!sportsGroup) return null;
    return channels.find((channel) => channel.group === sportsGroup) ?? null;
  }, [channels, sportsGroup]);

  const featuredChannel = useMemo(
    () => channels.find((channel) => channel.isFeatured) ?? channels[0] ?? null,
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

  const handleSelectChannel = useCallback((channel: ClientChannel) => {
    triggerSmartLink();
    setSelectedChannel(channel);
    setPlaybackKey((key) => key + 1);
    setPanelOpen(false);

    if (typeof window !== "undefined" && window.innerWidth < 1180) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleSelectGroup = useCallback(
    (group: string) => {
      setActiveGroup(group);
      setCategoriesOpen(false);

      if (typeof window !== "undefined" && window.innerWidth < 1180) {
        scrollToMobileChannels();
      }
    },
    [scrollToMobileChannels],
  );

  const handleTogglePanel = useCallback(() => {
    setPanelOpen((open) => !open);
  }, []);

  const handleToggleCategories = useCallback(() => {
    setCategoriesOpen((open) => !open);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const handleShowSports = useCallback(() => {
    if (!sportsGroup || !firstSportsChannel) return;
    setActiveGroup(sportsGroup);
    setSearchQuery("");
    setSelectedChannel(firstSportsChannel);
    setPlaybackKey((key) => key + 1);
    setPanelOpen(false);

    if (typeof window !== "undefined" && window.innerWidth < 1180) {
      scrollToMobileChannels();
    }
  }, [firstSportsChannel, scrollToMobileChannels, sportsGroup]);

  const handleShowAllChannels = useCallback(() => {
    handleSelectGroup("All");
  }, [handleSelectGroup]);

  const handlePlayFeatured = useCallback(() => {
    if (!featuredChannel) return;
    setActiveGroup("All");
    setSearchQuery("");
    setSelectedChannel(featuredChannel);
    setPlaybackKey((key) => key + 1);
    setPanelOpen(false);

    if (typeof window !== "undefined" && window.innerWidth < 1180) {
      scrollToMobileChannels();
    }
  }, [featuredChannel, scrollToMobileChannels]);

  const handleButtonPopunder = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (isButtonClickTarget(event.target)) {
        triggerPopunderAd();
      }
    },
    [],
  );

  if (catalogLoading) {
    return (
      <div className="iptv-app iptv-loading">
        <div className="iptv-loading-card">Loading channels…</div>
      </div>
    );
  }

  return (
    <div className="iptv-app" onClickCapture={handleButtonPopunder}>
      <header className="iptv-header">
        <div className="iptv-header-top">
          <div className="iptv-header-left">
            <button
              type="button"
              className="menu-button lg-hidden"
              onClick={handleTogglePanel}
              aria-label="Toggle channel panel"
            >
              <AppIcon icon={Menu} size={20} />
            </button>
            <div className="brand-block">
              <BrandLogo compact />
            </div>
          </div>

          <div className="iptv-search-wrap">
            <AppIcon icon={Search} size={18} className="search-icon" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search channel…"
              className="iptv-search"
            />
          </div>

          <div className="iptv-header-action">
            {sportsGroup ? (
              <button
                type="button"
                className={`sports-button ${
                  activeGroup === sportsGroup ? "active" : ""
                }`}
                onClick={handleShowSports}
              >
                <AppIcon icon={Goal} size={16} className="sports-icon" />
                Sports
              </button>
            ) : null}
            {featuredChannel ? (
              <button
                type="button"
                className="fifa-tv-button"
                onClick={handlePlayFeatured}
              >
                <AppIcon icon={Trophy} size={16} className="fifa-tv-icon" />
                World Cup Live
              </button>
            ) : null}
          </div>
        </div>

        <div className="mobile-header-filters" aria-label="Quick filters">
          <button
            type="button"
            className={`quick-filter ${activeGroup === "All" ? "active" : ""}`}
            onClick={handleShowAllChannels}
          >
            All channels
          </button>
          {sportsGroup ? (
            <button
              type="button"
              className={`quick-filter quick-filter-sports ${
                activeGroup === sportsGroup ? "active" : ""
              }`}
              onClick={handleShowSports}
            >
              <AppIcon icon={Goal} size={14} />
              Sports
            </button>
          ) : null}
          {featuredChannel ? (
            <button
              type="button"
              className="quick-filter quick-filter-fifa"
              onClick={handlePlayFeatured}
            >
              <AppIcon icon={Trophy} size={14} />
              World Cup
            </button>
          ) : null}
        </div>
      </header>

      <div className="iptv-layout">
        <main className="iptv-main">
          <div className="iptv-main-stack">
            <VideoPlayer channel={selectedChannel} playbackKey={playbackKey} />
            <LiveMatchEvents />
          </div>
        </main>

        {panelOpen && (
          <button
            type="button"
            className="panel-backdrop lg-hidden"
            aria-label="Close channel panel"
            onClick={handleClosePanel}
          />
        )}

        <aside
          ref={panelRef}
          className={`iptv-panel ${panelOpen ? "iptv-panel-open" : ""} mobile-channels-open`}
        >
          <div className="panel-top panel-top-desktop">
            <div className="panel-heading">
              <h2>Channels</h2>
              <span className="panel-count">{filteredChannels.length}</span>
            </div>

            <div className="quick-filters">
              <button
                type="button"
                className={`quick-filter ${activeGroup === "All" ? "active" : ""}`}
                onClick={() => handleSelectGroup("All")}
              >
                All
              </button>
              {sportsGroup ? (
                <button
                  type="button"
                  className={`quick-filter quick-filter-sports ${
                    activeGroup === sportsGroup ? "active" : ""
                  }`}
                  onClick={handleShowSports}
                >
                  <AppIcon icon={Goal} size={14} />
                  Sports
                </button>
              ) : null}
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
              <AppIcon
                icon={categoriesOpen ? ChevronUp : ChevronDown}
                size={18}
                className="category-toggle-chevron"
              />
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

          <ChannelList
            channels={filteredChannels}
            selectedChannelId={selectedChannel?.id}
            onSelect={handleSelectChannel}
          />

          <AdBanner placement="footer" />
        </aside>
      </div>
    </div>
  );
}
