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
    if (!v) return null;
    return JSON.parse(decodeURIComponent(v));
  } catch (e) {
    return null;
  }
}

function makeRawMessage({
  from,
  to,
  subject,
  messageText,
  filename,
  attachmentBase64,
}: any) {
  const boundary = "----=_Boundary_" + Date.now();
  const nl = "\r\n";
  const headers = [];
  headers.push(`From: ${from}`);
  headers.push(`To: ${to}`);
  headers.push(`Subject: ${subject}`);
  headers.push("MIME-Version: 1.0");
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

  const body = [];
  body.push(`--${boundary}`);
  body.push('Content-Type: text/plain; charset="UTF-8"');
  body.push("Content-Transfer-Encoding: 7bit");
  body.push("");
  body.push(messageText || "");
  body.push("");

  if (attachmentBase64 && filename) {
    body.push(`--${boundary}`);
    body.push(`Content-Type: application/pdf; name="${filename}"`);
    body.push("Content-Transfer-Encoding: base64");
    body.push(`Content-Disposition: attachment; filename="${filename}"`);
    body.push("");
    body.push(attachmentBase64);
    body.push("");
  }

  body.push(`--${boundary}--`);

  const raw = headers.join(nl) + nl + nl + body.join(nl);
  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return encoded;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { recipients, subject, message, filename, attachmentBase64 } = body;
  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json(
      { error: "No recipients provided" },
      { status: 400 }
    );
  }

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

  const tokensMap = readTokensFromCookie(req);
  if (!tokensMap || Object.keys(tokensMap).length === 0) {
    return NextResponse.json(
      { error: "No tokens stored; authorize first" },
      { status: 401 }
    );
  }

  // allow client to request a specific sender via ?sender= or body.sender
  const url = new URL(req.url);
  const senderQuery = url.searchParams.get("sender");
  const sender = senderQuery || (body && body.sender);

  let chosenToken: any = null;
  if (sender && tokensMap[sender]) chosenToken = tokensMap[sender];
  else {
    // pick first available
    const first = Object.keys(tokensMap)[0];
    chosenToken = tokensMap[first];
  }

  if (!chosenToken) {
    return NextResponse.json(
      { error: "No token available for sender" },
      { status: 401 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirect);
  oauth2Client.setCredentials(chosenToken);

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  try {
    const raw = makeRawMessage({
      from: "me",
      to: recipients.join(", "),
      subject: subject || "Invoice",
      messageText: message || "",
      filename,
      attachmentBase64,
    });

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    return NextResponse.json({ ok: true, result: res.data });
  } catch (err: any) {
    console.error("Gmail send error", err?.message || err);
    if (err?.code === 401 || (err?.response && err.response.status === 401)) {
      return NextResponse.json(
        { error: "Unauthorized with Gmail", details: err?.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to send email", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
