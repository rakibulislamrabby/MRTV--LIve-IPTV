import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BLOCKED_PATTERNS = [
  /\.m3u$/i,
  /\/channels\.json$/i,
  /^\/generated\//i,
  /^\/data\//i,
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.svg).*)"],
};
