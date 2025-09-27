import { NextResponse } from "next/server";
import cookie from "cookie";

export const runtime = "nodejs";

function readTokensFromCookie(req: Request) {
  try {
    const raw = req.headers.get("cookie") || "";
    const parsed = cookie.parse(raw || "");
    const v = parsed["gmail_tokens"];
    if (!v) return {} as Record<string, any>;
    return JSON.parse(decodeURIComponent(v));
  } catch (e) {
    return {} as Record<string, any>;
  }
}

function makeSetCookie(tokensMap: Record<string, any>) {
  const value = encodeURIComponent(JSON.stringify(tokensMap));
  return cookie.serialize("gmail_tokens", value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email } = body as any;
  if (!email)
    return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const tokensMap = readTokensFromCookie(req);
  if (tokensMap[email]) delete tokensMap[email];
  const res = NextResponse.json({ ok: true });
  // If no tokens remain, set a short-lived cookie (3 minutes) so the cookie is removed shortly.
  if (!tokensMap || Object.keys(tokensMap).length === 0) {
    const short = cookie.serialize("gmail_tokens", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 3, // 3 minutes
    });
    res.headers.set("Set-Cookie", short);
    return res;
  }

  res.headers.set("Set-Cookie", makeSetCookie(tokensMap));
  return res;
}
