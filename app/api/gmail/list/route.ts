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

export async function GET(req: Request) {
  const tokensMap = readTokensFromCookie(req);
  const accounts = Object.keys(tokensMap || {});
  return NextResponse.json({ accounts });
}
