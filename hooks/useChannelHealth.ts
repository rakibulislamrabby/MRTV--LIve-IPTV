"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { probeChannel } from "@/lib/stream-probe";
import type { Channel } from "@/lib/types";

const STORAGE_KEY = "mrtv-offline-channels";
const RECHECK_INTERVAL_MS = 20_000;
const INITIAL_RECHECK_MS = 6_000;
const MAX_PARALLEL_PROBES = 2;

function loadOfflineIds(): Set<string> {
  if (typeof window === "undefined") return new Set();

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveOfflineIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function useChannelHealth(channels: Channel[]) {
  const [offlineIds, setOfflineIds] = useState<Set<string>>(
    () => new Set(),
  );
  const activeProbesRef = useRef(0);
  const probeIndexRef = useRef(0);

  useEffect(() => {
    setOfflineIds(loadOfflineIds());
  }, []);

  const markOnline = useCallback((channelId: string) => {
    setOfflineIds((current) => {
      if (!current.has(channelId)) return current;
      const next = new Set(current);
      next.delete(channelId);
      saveOfflineIds(next);
      return next;
    });
  }, []);

  const markOffline = useCallback((channelId: string) => {
    setOfflineIds((current) => {
      if (current.has(channelId)) return current;
      const next = new Set(current);
      next.add(channelId);
      saveOfflineIds(next);
      return next;
    });
  }, []);

  const reportPlayback = useCallback(
    (channelId: string, ok: boolean) => {
      if (ok) markOnline(channelId);
      else markOffline(channelId);
    },
    [markOffline, markOnline],
  );

  const filterAvailable = useCallback(
    (list: Channel[]) => list.filter((channel) => !offlineIds.has(channel.id)),
    [offlineIds],
  );

  const isAvailable = useCallback(
    (channelId: string) => !offlineIds.has(channelId),
    [offlineIds],
  );

  useEffect(() => {
    if (offlineIds.size === 0) return;

    let cancelled = false;

    const getOfflineChannels = () =>
      channels.filter((channel) => offlineIds.has(channel.id));

    const probeNext = async () => {
      if (cancelled || activeProbesRef.current >= MAX_PARALLEL_PROBES) {
        return;
      }

      const offlineChannels = getOfflineChannels();
      if (offlineChannels.length === 0) return;

      const channel =
        offlineChannels[probeIndexRef.current % offlineChannels.length];
      probeIndexRef.current += 1;
      activeProbesRef.current += 1;

      try {
        const ok = await probeChannel(channel);
        if (!cancelled && ok) markOnline(channel.id);
      } finally {
        activeProbesRef.current -= 1;
      }
    };

    const recheckOffline = () => {
      const slots = Math.min(
        MAX_PARALLEL_PROBES,
        getOfflineChannels().length,
      );
      for (let index = 0; index < slots; index += 1) {
        void probeNext();
      }
    };

    const initial = window.setTimeout(recheckOffline, INITIAL_RECHECK_MS);
    const interval = window.setInterval(recheckOffline, RECHECK_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        recheckOffline();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [channels, offlineIds, markOnline]);

  return {
    offlineIds,
    offlineCount: offlineIds.size,
    markOnline,
    markOffline,
    reportPlayback,
    filterAvailable,
    isAvailable,
  };
}
