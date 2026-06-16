import { NextResponse } from "next/server";

import type { ClientChannel } from "@/lib/client-channel";
import { getChannels } from "@/lib/channels";
import { isFeaturedStreamUrl } from "@/lib/featured-channel";

export const dynamic = "force-dynamic";

export async function GET() {
  const channels = getChannels().map(
    (channel): ClientChannel => ({
      id: channel.id,
      name: channel.name,
      logo: channel.logo,
      group: channel.group,
      source: channel.source,
      hasBackup: Boolean(channel.fallbackUrl),
      isFeatured: isFeaturedStreamUrl(channel.url),
    }),
  );

  return NextResponse.json(channels, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
