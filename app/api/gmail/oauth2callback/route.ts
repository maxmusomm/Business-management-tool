import { NextResponse } from "next/server";
import cookie from "cookie";

let google: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  google = require("googleapis").google;
} catch (e) {
  google = null;
}

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
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_REDIRECT_URI;

  if (!google) {
    return NextResponse.json(
      { error: "Server missing 'googleapis' dependency" },
      { status: 500 }
    );
  }
  if (!clientId || !clientSecret || !redirect) {
    const details = {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirect: !!redirect,
    };
    console.error("Missing Google OAuth env vars", details);
    return NextResponse.json(
      { error: "Missing Google OAuth environment variables", details },
      { status: 500 }
    );
  }
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirect);
  try {
    const { tokens } = await oauth2Client.getToken(code);

    // fetch userinfo to obtain email to key tokens by email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const me = await oauth2.userinfo.get();
    const email = me?.data?.email;

    if (!email) {
      console.error(
        "Could not obtain user email from Google userinfo",
        me?.data
      );
      return NextResponse.json(
        { error: "Failed to get user email" },
        { status: 500 }
      );
    }

    // read existing tokens map from cookie
    const existing = readTokensFromCookie(req);
    existing[email] = tokens;

    // NextResponse.redirect requires an absolute URL in this runtime context.
    // Build an absolute URL from the incoming request URL.
    const redirectUrl = new URL("/", req.url).toString();
    const res = NextResponse.redirect(redirectUrl);
    res.headers.set("Set-Cookie", makeSetCookie(existing));
    return res;
  } catch (err) {
    // Log full error for server-side debugging (do not expose secrets)
    console.error("oauth2 getToken error:", err);
    const details: any = {};
    if (err && typeof err === "object") {
      const e: any = err;
      details.message = e?.message || String(e);
      try {
        if (e.response && e.response.data) details.response = e.response.data;
      } catch (e2) {
        // ignore
      }
    }
    return NextResponse.json(
      { error: "Failed to exchange code", details },
      { status: 500 }
    );
  }
}
