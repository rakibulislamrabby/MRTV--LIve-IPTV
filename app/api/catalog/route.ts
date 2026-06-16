import { NextResponse } from "next/server";

import { getChannels, getFeaturedChannel } from "@/lib/channels";
import type { ClientChannel } from "@/lib/client-channel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const featuredId = getFeaturedChannel()?.id;
  const channels = getChannels();

  const clientChannels: ClientChannel[] = channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    logo: channel.logo,
    group: channel.group,
    isFeatured: channel.id === featuredId,
    hasBackup: false,
  }));

  return NextResponse.json(clientChannels, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
