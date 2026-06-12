import { NextResponse } from "next/server";

import { getCachedManifest, setCachedManifest } from "@/lib/manifest-cache";
import { decodeSecret, isAllowedStreamUrl } from "@/lib/obfuscate";
import { rewriteManifest } from "@/lib/stream-proxy";
import { fetchUpstream, isHlsTarget } from "@/lib/upstream";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t");

  if (!token) {
    return new NextResponse("Bad request", { status: 400 });
  }

  let target: string;
  try {
    target = decodeSecret(token);
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!isAllowedStreamUrl(target)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const cacheKey = `segment:${target}`;
  const cached = getCachedManifest(cacheKey);
  if (cached) {
    return new NextResponse(cached, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "private, max-age=2",
      },
    });
  }

  try {
    const upstream = await fetchUpstream(target);

    if (!upstream.ok) {
      return new NextResponse("Upstream unavailable", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "";

    if (isHlsTarget(target, contentType)) {
      const manifest = await upstream.text();
      const rewritten = rewriteManifest(manifest, target);
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
  } catch {
    return new NextResponse("Segment error", { status: 502 });
  }
}
