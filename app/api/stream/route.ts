import { NextResponse } from "next/server";

import { getChannelById, getPlaybackUrls } from "@/lib/channels";
import { rewriteManifest } from "@/lib/manifest-rewrite";
import { isAllowedStreamUrl } from "@/lib/stream-token";
import {
  fetchUpstream,
  isHlsManifest,
  segmentContentType,
} from "@/lib/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 26;

async function proxyTarget(target: string): Promise<NextResponse | null> {
  if (!isAllowedStreamUrl(target)) return null;

  const upstream = await fetchUpstream(target);
  if (!upstream.ok) return null;

  const contentType = upstream.headers.get("content-type") ?? "";

  if (isHlsManifest(target, contentType)) {
    const body = await upstream.text();
    return new NextResponse(rewriteManifest(body, target), {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "private, max-age=2",
      },
    });
  }

  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": segmentContentType(target, contentType),
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const useFallback = searchParams.get("fb") === "1";

  if (!id) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const channel = getChannelById(id);
  if (!channel) {
    return new NextResponse("Not found", { status: 404 });
  }

  for (const target of getPlaybackUrls(channel, useFallback)) {
    try {
      const response = await proxyTarget(target);
      if (response) return response;
    } catch {
      // try next candidate
    }
  }

  return new NextResponse("Upstream unavailable", { status: 502 });
}
