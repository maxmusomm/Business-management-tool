export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { db } from "../../../src/db/client";
import { invoicesTable } from "../../../src/db/schema";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const now = new Date().toISOString();

    // Normalize incoming fields (some client pages send quotation* fields)
    const invoiceNumber =
      payload.invoiceNumber ??
      payload.quotationNumber ??
      payload.number ??
      `INV-${Date.now()}`;
    const issuedAt = payload.invoiceDate ?? payload.quoteDate ?? now;
    const dueAt = payload.dueDate ?? payload.validUntil ?? null;
    const paymentTerms = payload.paymentTerms ?? payload.payment_terms ?? null;
    const subtotal = Number(payload.subtotal ?? payload.subtotal_cents ?? 0);
    const tax = Number(payload.tax ?? payload.tax_cents ?? 0);
    const total = Number(payload.total ?? payload.total_cents ?? 0);

    const insert = await db
      .insert(invoicesTable)
      .values({
        invoice_number: invoiceNumber,
        customer_id: payload.customerId || null,
        bill_to: JSON.stringify(payload.billTo || {}),
        from_info: JSON.stringify(payload.from || {}),
        project: payload.project || null,
        issued_at: issuedAt,
        due_at: dueAt,
        payment_terms: paymentTerms,
        subtotal_cents: Math.round(subtotal * 100),
        tax_cents: Math.round(tax * 100),
        total_cents: Math.round(total * 100),
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

    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
    });
  } catch (err: any) {
    console.error("Invoices insert error:", err);
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
