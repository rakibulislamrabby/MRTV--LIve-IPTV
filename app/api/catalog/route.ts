import { NextResponse } from "next/server";

import { CHANNELS, getFeaturedChannel } from "@/lib/channels";
import type { ClientChannel } from "@/lib/client-channel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const featuredId = getFeaturedChannel()?.id;

  const channels: ClientChannel[] = CHANNELS.map((channel) => ({
    id: channel.id,
    name: channel.name,
    logo: channel.logo,
    group: channel.group,
    isFeatured: channel.id === featuredId,
    hasBackup: Boolean(channel.fallbackUrls?.length),
  }));

  return NextResponse.json(channels, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
