import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "lf_preview_access";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Build a public absolute URL that respects reverse-proxy / tunnel headers. */
function publicUrl(request: NextRequest, pathname: string, search?: string): URL {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost || request.headers.get("host") || "localhost").split(",")[0].trim();
  const protoHeader = request.headers.get("x-forwarded-proto");
  const proto = (protoHeader || (host.includes("localhost") ? "http" : "https"))
    .split(",")[0]
    .trim();

  const url = new URL(request.url);
  url.protocol = `${proto}:`;
  url.host = host;
  // Drop explicit localhost ports when behind a public HTTPS tunnel
  if (!host.includes("localhost") && !/^\d+\.\d+\.\d+\.\d+/.test(host)) {
    url.port = "";
  }
  url.pathname = pathname;
  url.search = search || "";
  return url;
}

export function middleware(request: NextRequest) {
  const accessCode = process.env.PREVIEW_ACCESS_CODE?.trim();
  // When unset, gate is disabled (local/dev). Production preview always sets it.
  if (!accessCode) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/access") ||
    pathname === "/api/preview-access" ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  // API rewrite stays behind the same cookie gate
  const cookie = request.cookies.get(COOKIE)?.value || "";
  if (timingSafeEqual(cookie, accessCode)) {
    return NextResponse.next();
  }

  const nextParam = pathname.startsWith("/") ? pathname : "/login";
  const target = publicUrl(
    request,
    "/access",
    `?next=${encodeURIComponent(nextParam)}`,
  );
  return NextResponse.redirect(target);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
