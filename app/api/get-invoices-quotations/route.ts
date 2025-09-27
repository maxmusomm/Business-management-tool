import { NextRequest } from "next/server";
import { db } from "../../../src/db/client";
import { invoicesTable, quotationsTable } from "@/src/db/schema";

export async function GET(req: NextRequest) {
  try {
    // fetch latest rows from both tables (limit to avoid large payloads)
    const [invoices, quotations] = await Promise.all([
      db.select().from(invoicesTable).limit(16),
      db.select().from(quotationsTable).limit(16),
    ]);

    const recentActivity: any[] = [...invoices, ...quotations];

    // sort ascending by created_at (oldest first)
    recentActivity.sort((a, b) => {
      const ta = a.created_at ? new Date(String(a.created_at)).getTime() : 0;
      const tb = b.created_at ? new Date(String(b.created_at)).getTime() : 0;
      return ta - tb;
    });

    // limit overall results to 16
    const accendingOrder = recentActivity.slice(0, 16);

    return new Response(
      JSON.stringify({ ok: true, recentActivity: accendingOrder }),
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("get-invoices-quotations error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error?.message || String(error) }),
      {
        status: 500,
      }
    );
  }
}
