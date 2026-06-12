import { NextResponse } from "next/server";

import { getChannelById } from "@/lib/channels";
import { getCachedManifest, setCachedManifest } from "@/lib/manifest-cache";
import { isAllowedStreamUrl } from "@/lib/obfuscate";
import { rewriteManifest } from "@/lib/stream-proxy";
import { getPlaybackCandidates } from "@/lib/stream-url";
import { fetchUpstream, isHlsTarget } from "@/lib/upstream";

export const dynamic = "force-dynamic";

async function proxyTarget(target: string): Promise<NextResponse | null> {
  if (!isAllowedStreamUrl(target)) {
    return null;
  }

  const cacheKey = `stream:${target}`;
  const cached = getCachedManifest(cacheKey);
  if (cached) {
    return new NextResponse(cached, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "private, max-age=2",
      },
    });
  }

  const upstream = await fetchUpstream(target);
  if (!upstream.ok) {
    return null;
  }

  const contentType = upstream.headers.get("content-type") ?? "";

  if (isHlsTarget(target, contentType)) {
    const body = await upstream.text();
    const rewritten = rewriteManifest(body, target);
    setCachedManifest(cacheKey, rewritten);
    return new NextResponse(rewritten, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "private, max-age=2",
      },
    });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": contentType || "application/octet-stream",
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

  const candidates = getPlaybackCandidates(channel, useFallback);

  for (const target of candidates) {
    try {
      const response = await proxyTarget(target);
      if (response) {
        return response;
      }
    } catch {
      // continue trying additional candidates
    }
  }

  return new NextResponse("Upstream unavailable", { status: 502 });
}
