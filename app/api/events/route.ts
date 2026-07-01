import { NextResponse } from "next/server";

import { normalizeFutrowEvents } from "@/lib/futrow-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FUTROW_EVENTS_URL = "https://futrow.live/api/events";

export async function GET() {
  const token = process.env.token;

  if (!token) {
    return NextResponse.json(
      { error: "Missing token configuration" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(FUTROW_EVENTS_URL, {
      headers: {
        x_authorization: token,
      },
      cache: "no-store",
      redirect: "follow",
    });

    const data: unknown = await response.json();
    const events = normalizeFutrowEvents(data);

    if ("error" in (data as Record<string, unknown>)) {
      return NextResponse.json(data, {
        status: response.status === 200 ? 502 : response.status,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    return NextResponse.json(events, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch live events" },
      { status: 502 },
    );
  }
}
