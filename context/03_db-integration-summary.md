# 03 - Database integration summary

Hello — this file records what we just connected and implemented so you (or anyone else) can quickly understand the DB work that was done.

## High level

1. Connected the Next.js application to a Postgres database.
2. Integrated Drizzle ORM (node-postgres driver) as the app's ORM.
3. Implemented API handlers that insert metadata rows into the database when a user creates a quotation or an invoice from the UI.

## Key files changed / added

- `src/db/client.ts` — Creates a `pg` Pool and exports a Drizzle `db` instance. This file now reads `NEXT_PRIVATE_DATABASE_URL` (preferred) and falls back to `DATABASE_URL`.
- `src/db/schema.ts` — Drizzle table definitions (quotations, invoices, line_items, etc.). Monetary values are stored as integer cents (e.g. `subtotal_cents`).
- `app/api/quotations/route.ts` — POST endpoint that inserts a row into the `quotations` table. Converts decimal money values into cents and stores contact blocks as JSON strings.
- `app/api/invoices/route.ts` — POST endpoint that inserts a row into the `invoices` table. It now normalizes payload keys (accepts `quotationNumber` or `invoiceNumber`), ensures `invoice_number` is never null, and converts money to cents.
- `app/api/quotations/pdf/route.ts` — POST endpoint that generates a PDF from the HTML template (server-only PDF helper is used). The invoices page currently re-uses this PDF endpoint by passing `titleText: "INVOICE"` to the template generator.
- `lib/quotation-template-server.ts` — (server-only) helper used to generate PDF buffers.
- `app/quotations/new/page.tsx` and `app/invoices/new/page.tsx` — Client pages updated to POST metadata to `/api/quotations` and `/api/invoices` respectively before requesting the PDF generation. The save is best-effort (non-blocking) — if save fails the client still requests the PDF.

## Environment

- Use `NEXT_PRIVATE_DATABASE_URL` for the database connection string in dev/production private runtime. The client code now falls back to `DATABASE_URL` if `NEXT_PRIVATE_DATABASE_URL` is not set.
- Example (do not commit real credentials):

```
NEXT_PRIVATE_DATABASE_URL=postgres://user:pass@host:5432/dbname
```

## Runtime considerations

- App routes that use server-only packages (Drizzle/pg or html-pdf-node) were explicitly set to run in Node by adding:

```ts
export const runtime = "nodejs";
```

This prevents the Next bundler from trying to resolve `pg` for edge/client runtimes.

## Data shape and behavior

- Monetary values: stored as integer cents on the server (fields like `subtotal_cents`, `tax_cents`, `total_cents`). The client sends decimals (e.g. 2500.00) and the API multiplies by 100 and rounds.
- Contacts and metadata: `bill_to` and `from_info` are stored as JSON strings using `JSON.stringify(...)` in the DB.
- Line items: currently only `line_item_count` is persisted; individual line item rows are not written to the `line_items` table yet.
- Timestamps: `created_at` and `updated_at` are ISO strings (e.g. `new Date().toISOString()`).

## How saving is triggered

- The client pages call the save endpoints only when the user presses the **Download** button.
- The save POST is best-effort: if the save fails, the client proceeds to request the PDF so the user still gets the document; however, the metadata may not be persisted.
- The PDF endpoint does not save metadata itself (the invoice page sends its metadata to `/api/invoices` then calls `/api/quotations/pdf` to get the PDF). If you want atomic save+PDF, we can combine them so a single request inserts and returns the PDF.

## How to test locally

1. Ensure env var is set (or place in `.env`):

```bash
export NEXT_PRIVATE_DATABASE_URL="postgres://user:pass@host:5432/dbname"
```

2. (Optional) Apply migrations / push schema if you use drizzle-kit:

```bash
npx drizzle-kit push
```

3. Install dependencies including `pg` (the Postgres client):

```bash
npm install
npm install pg --save
```

4. Start the dev server:

```bash
npm run dev
```

5. Open the app, create a quotation or invoice, press Download. Verify:
   - `/api/quotations` or `/api/invoices` returns `201`.
   - The row shows up in the database (query the table or check with your DB UI).
   - PDF is downloaded from `/api/quotations/pdf`.

## Known limitations and suggestions

- Line items are not yet persisted individually; if you need detailed line item records, add server logic to insert into `line_items` and wrap in a transaction.
- Consider making save atomic with PDF generation (insert then generate PDF in the same request) if you need a strict guarantee the document was saved when the PDF was issued.
- Add server-side input validation on the API endpoints to avoid malformed inserts.
- Consider storing timestamps as `timestamptz` in Postgres (instead of ISO strings) for richer DB-side querying.

## Quick changelog

- Connected Drizzle + pg in `src/db/client.ts` and used `NEXT_PRIVATE_DATABASE_URL`.
- Added/updated `src/db/schema.ts` for invoices/quotations.
- Implemented server routes to insert invoices/quotations and wired client pages to call them on Download.
- Fixed bundling issues by marking API routes as `runtime = "nodejs"`.

---

If you want, I can add a short bullet-proof test script that posts a sample invoice payload to `/api/invoices` and verifies the DB row was created (using the same `NEXT_PRIVATE_DATABASE_URL`). Would you like that?
