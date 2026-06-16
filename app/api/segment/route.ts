import { NextResponse } from "next/server";

import { rewriteManifest } from "@/lib/manifest-rewrite";
import { decodeStreamTarget, isAllowedStreamUrl } from "@/lib/stream-token";
import {
  fetchUpstream,
  isHlsManifest,
  segmentContentType,
} from "@/lib/upstream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 26;

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t");

  if (!token) {
    return new NextResponse("Bad request", { status: 400 });
  }

  let target: string;
  try {
    target = decodeStreamTarget(token);
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!isAllowedStreamUrl(target)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const range = request.headers.get("range");
    const upstream = await fetchUpstream(
      target,
      range ? { headers: { Range: range } } : {},
    );

    if (!upstream.ok) {
      return new NextResponse("Upstream unavailable", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "";

    if (isHlsManifest(target, contentType)) {
      const manifest = await upstream.text();
      return new NextResponse(rewriteManifest(manifest, target), {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "private, max-age=2",
        },
      });
    }

    const buffer = await upstream.arrayBuffer();
    const headers: Record<string, string> = {
      "Content-Type": segmentContentType(target, contentType),
      "Cache-Control": "no-store",
    };

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers["Content-Range"] = contentRange;

    return new NextResponse(buffer, {
      status: upstream.status === 206 ? 206 : 200,
      headers,
    });
  } catch {
    return new NextResponse("Segment error", { status: 502 });
  }
}
