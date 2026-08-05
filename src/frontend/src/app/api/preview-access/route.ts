import { NextResponse } from "next/server";

const COOKIE = "lf_preview_access";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function POST(request: Request) {
  const expected = process.env.PREVIEW_ACCESS_CODE?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "Preview access gate is not configured." },
      { status: 503 },
    );
  }

  let body: { code?: string } = {};
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const provided = String(body.code || "").trim();
  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Invalid access code." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE,
    value: expected,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return res;
}
