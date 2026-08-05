import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "lf_preview_access";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
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

  const url = request.nextUrl.clone();
  url.pathname = "/access";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
