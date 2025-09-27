export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { db, pool } from "../../../src/db/client";
import { quotationsTable } from "../../../src/db/schema";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const now = new Date().toISOString();

    function toIsoStringSafe(value: any): string | null {
      if (value === null || value === undefined) return null;
      if (typeof value === "string") return value;
      if (typeof value === "number") return new Date(value).toISOString();
      if (value instanceof Date && typeof value.toISOString === "function")
        return value.toISOString();
      if (value && typeof value.toISOString === "function")
        return value.toISOString();
      try {
        const d = new Date(String(value));
        if (!isNaN(d.getTime())) return d.toISOString();
      } catch (e) {
        // ignore
      }
      return String(value);
    }

    // Build normalized record
    const record = {
      quotation_number: payload.quotationNumber,
      customer_id: payload.customerId || null,
      bill_to: JSON.stringify(payload.billTo || {}),
      from_info: JSON.stringify(payload.from || {}),
      project: payload.project || null,
      issued_at: toIsoStringSafe(payload.quoteDate ?? now),
      valid_until: toIsoStringSafe(payload.validUntil ?? null),
      payment_terms: payload.paymentTerms ?? null,
      subtotal_cents: Math.round((payload.subtotal || 0) * 100),
      tax_cents: Math.round((payload.tax || 0) * 100),
      total_cents: Math.round((payload.total || 0) * 100),
      currency: payload.currency || "USD",
      status: payload.status || "sent",
      line_item_count: (payload.items || []).length,
      notes: payload.notes || null,
      metadata: JSON.stringify(payload.metadata || {}),
      created_by: payload.createdBy || null,
    } as any;

    // Try to insert; on unique key violation, perform an update instead
    try {
      await db.insert(quotationsTable).values(record);
      return new Response(JSON.stringify({ ok: true, action: "inserted" }), {
        status: 201,
      });
    } catch (err: any) {
      // Postgres unique-violation code is 23505; if it's for quotation_number, update instead
      const pgErr = err;
      if (pgErr?.code === "23505") {
        try {
          // Use raw SQL update through the pg pool to avoid Drizzle typing issues
          const updateSql = `UPDATE quotations SET
            customer_id = $1,
            bill_to = $2,
            from_info = $3,
            project = $4,
            issued_at = $5,
            valid_until = $6,
            payment_terms = $7,
            subtotal_cents = $8,
            tax_cents = $9,
            total_cents = $10,
            currency = $11,
            status = $12,
            line_item_count = $13,
            notes = $14,
            metadata = $15,
            created_by = $16,
            updated_at = $17
            WHERE quotation_number = $18`;

          const params = [
            record.customer_id,
            record.bill_to,
            record.from_info,
            record.project,
            record.issued_at,
            record.valid_until,
            record.payment_terms,
            record.subtotal_cents,
            record.tax_cents,
            record.total_cents,
            record.currency,
            record.status,
            record.line_item_count,
            record.notes,
            record.metadata,
            record.created_by,
            record.updated_at,
            record.quotation_number,
          ];

          await pool.query(updateSql, params as any[]);

          return new Response(JSON.stringify({ ok: true, action: "updated" }), {
            status: 200,
          });
        } catch (uErr: any) {
          console.error("Quotations update error:", uErr);
          return new Response(
            JSON.stringify({
              error: "Update failed",
              message: uErr?.message || String(uErr),
            }),
            { status: 500 }
          );
        }
      }
      throw err;
    }
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
