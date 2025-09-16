export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { db } from "../../../src/db/client";
import { quotationsTable } from "../../../src/db/schema";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const now = new Date().toISOString();
    const insert = await db
      .insert(quotationsTable)
      .values({
        quotation_number: payload.quotationNumber,
        customer_id: payload.customerId || null,
        bill_to: JSON.stringify(payload.billTo || {}),
        from_info: JSON.stringify(payload.from || {}),
        project: payload.project || null,
        issued_at: payload.quoteDate || now,
        valid_until: payload.validUntil || null,
        payment_terms: payload.paymentTerms || null,
        subtotal_cents: Math.round((payload.subtotal || 0) * 100),
        tax_cents: Math.round((payload.tax || 0) * 100),
        total_cents: Math.round((payload.total || 0) * 100),
        currency: payload.currency || "USD",
        status: payload.status || "sent",
        line_item_count: (payload.items || []).length,
        notes: payload.notes || null,
        metadata: JSON.stringify(payload.metadata || {}),
        created_by: payload.createdBy || null,
        created_at: now,
        updated_at: now,
      })
      .returning();

    return new Response(JSON.stringify({ ok: true, inserted: insert }), {
      status: 201,
    });
  } catch (err: any) {
    console.error("Quotations insert error:", err);
    return new Response(
      JSON.stringify({
        error: "Insert failed",
        message: err?.message || String(err),
      }),
      {
        status: 500,
      }
    );
  }
}
