export interface FutrowEvent {
  event: string;
  minute?: number;
  team?: string;
}

export function eventKey(event: FutrowEvent): string {
  return `${event.event}:${event.minute ?? ""}:${event.team ?? ""}`;
}

export function isFutrowEvent(value: unknown): value is FutrowEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "event" in value &&
    typeof (value as FutrowEvent).event === "string"
  );
}

export function normalizeFutrowEvents(data: unknown): FutrowEvent[] {
  if (!data || typeof data !== "object") return [];
  if ("error" in data) return [];

  if (Array.isArray(data)) {
    return data.filter(isFutrowEvent);
  }

  return isFutrowEvent(data) ? [data] : [];
}

export function formatEventLabel(event: FutrowEvent): string {
  switch (event.event) {
    case "GOAL_SCORED":
      return "Goal scored";
    default:
      return event.event.replaceAll("_", " ").toLowerCase();
  }
}

export function formatEventDetail(event: FutrowEvent): string {
  const parts: string[] = [];

  if (event.team) parts.push(event.team);
  if (typeof event.minute === "number") parts.push(`${event.minute}'`);

  return parts.join(" · ");
}
