"use client";

import { Goal, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  eventKey,
  formatEventDetail,
  formatEventLabel,
  type FutrowEvent,
} from "@/lib/futrow-events";

import { AppIcon } from "./icons";

const POLL_INTERVAL_MS = 5_000;
const GOAL_BANNER_MS = 8_000;
const MAX_EVENTS = 12;

function mergeEvents(existing: FutrowEvent[], incoming: FutrowEvent[]): FutrowEvent[] {
  const seen = new Set(existing.map(eventKey));
  const merged = [...existing];

  for (const event of incoming) {
    const key = eventKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.unshift(event);
  }

  return merged.slice(0, MAX_EVENTS);
}

export function LiveMatchEvents() {
  const [events, setEvents] = useState<FutrowEvent[]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "offline">("loading");
  const [goalBanner, setGoalBanner] = useState<FutrowEvent | null>(null);
  const seenKeysRef = useRef(new Set<string>());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    let bannerTimer: number | undefined;

    const showGoalBanner = (event: FutrowEvent) => {
      setGoalBanner(event);
      window.clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(() => {
        setGoalBanner(null);
      }, GOAL_BANNER_MS);
    };

    const pollEvents = async () => {
      try {
        const response = await fetch("/api/events", { cache: "no-store" });
        const data = (await response.json()) as FutrowEvent[] | { error?: string };

        if (cancelled) return;

        if (!response.ok || !Array.isArray(data)) {
          setStatus((current) => (current === "live" ? "live" : "offline"));
          return;
        }

        setStatus("live");

        if (data.length === 0) return;

        const newEvents: FutrowEvent[] = [];

        for (const event of data) {
          const key = eventKey(event);
          if (seenKeysRef.current.has(key)) continue;
          seenKeysRef.current.add(key);
          newEvents.push(event);
        }

        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          setEvents((current) => mergeEvents(current, data));
          return;
        }

        if (newEvents.length === 0) return;

        setEvents((current) => mergeEvents(current, newEvents));

        const latestGoal = newEvents.find((event) => event.event === "GOAL_SCORED");
        if (latestGoal) {
          showGoalBanner(latestGoal);
        }
      } catch {
        if (!cancelled) {
          setStatus((current) => (current === "live" ? "live" : "offline"));
        }
      }
    };

    void pollEvents();
    const intervalId = window.setInterval(() => {
      void pollEvents();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(bannerTimer);
    };
  }, []);

  const latestEvent = events[0] ?? null;

  return (
    <section className="live-events" aria-live="polite">
      {goalBanner ? (
        <div className="live-events-goal-banner" role="status">
          <AppIcon icon={Goal} size={22} className="live-events-goal-icon" />
          <div>
            <strong>GOAL!</strong>
            <span>{formatEventDetail(goalBanner)}</span>
          </div>
        </div>
      ) : null}

      <div className="live-events-card">
        <div className="live-events-header">
          <div className="live-events-title-wrap">
            <AppIcon icon={Radio} size={16} className="live-events-title-icon" />
            <h3>Live Match Events</h3>
          </div>
          <span
            className={`live-events-status live-events-status-${status}`}
          >
            {status === "loading"
              ? "Connecting…"
              : status === "live"
                ? "Live"
                : "Unavailable"}
          </span>
        </div>

        {latestEvent ? (
          <div className="live-events-highlight">
            <span className="live-events-highlight-label">
              {formatEventLabel(latestEvent)}
            </span>
            <strong>{formatEventDetail(latestEvent) || "Update received"}</strong>
          </div>
        ) : (
          <p className="live-events-empty">
            {status === "offline"
              ? "Live events are unavailable right now."
              : "Waiting for match updates…"}
          </p>
        )}

        {events.length > 1 ? (
          <ul className="live-events-feed">
            {events.slice(1).map((event) => (
              <li key={eventKey(event)}>
                <span>{formatEventLabel(event)}</span>
                <span>{formatEventDetail(event)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
