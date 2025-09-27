import { NextResponse } from "next/server";
import "dotenv/config";
export const runtime = "nodejs";

export async function GET(req: Request) {
  // dynamic import to avoid bundling/type errors when dependency missing
  let google;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    google = require("googleapis").google;
  } catch (e) {
    return NextResponse.json(
      { error: "Server missing 'googleapis' dependency" },
      { status: 500 }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirect) {
    // don't leak values; return which keys are present to aid debugging
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

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirect);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "openid",
      "email",
      "profile",
    ],
  });

  return NextResponse.redirect(authUrl);
}
