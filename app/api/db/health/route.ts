export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { pool } from "../../../../src/db/client";

export async function GET(_req: NextRequest) {
  try {
    const res = await pool.query("SELECT 1 as ok");
    return new Response(JSON.stringify({ ok: true, result: res.rows }), {
      status: 200,
    });
  } catch (err: any) {
    console.error("DB health check failed:", err);
    return new Response(
      JSON.stringify({ ok: false, message: err?.message || String(err) }),
      { status: 500 }
    );
  }
}
