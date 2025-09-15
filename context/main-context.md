## Application main context — Quotation & Invoice Maker

This document captures the high-level context, data model, and webhook contract for the Quotation & Invoice Maker application. It is intended to be a short living reference for developers implementing the app and the Google Sheets webhook receiver.

### Purpose

- Create, preview, and export quotations and invoices (PDF and HTML).
- Persist a lightweight record of generated quotations/invoices to Google Sheets via a webhook so business users have a simple ledger.

### Actors

- User (sales/office): interacts with a UI to build a quotation or invoice.
- App server (this project): renders PDFs/HTML and triggers webhook calls to persist records. When using Next.js this server-side logic typically lives in `pages/api/*` API routes or server-side functions.
- Google Sheets webhook receiver: accepts POST requests and appends rows to a sheet (could be Apps Script or a small server).

### Goals for the webhook

1. Provide a stable, minimal JSON payload that the sheet receiver can map to columns.
2. Include enough metadata to find and reconcile PDFs or re-send data if webhook delivery fails.
3. Keep the payload small so Apps Script / simple endpoints can easily parse it.

### Proposed webhook contract (v1)

Top-level JSON object. Fields marked REQUIRED must be present. Fields marked OPTIONAL may be omitted.

- id (string) — REQUIRED: UUID or unique slug for this document (quotation or invoice).
- type (string) — REQUIRED: "quotation" | "invoice"
- version (string) — REQUIRED: schema version, e.g. "1.0"
- createdAt (string, ISO 8601) — REQUIRED: timestamp when the document was generated
- updatedAt (string, ISO 8601) — OPTIONAL: last update timestamp
- status (string) — OPTIONAL: e.g. "draft", "sent", "accepted", "paid"
- customer: OBJECT — REQUIRED: lightweight customer info
  - id (string) — OPTIONAL: customer id from CRM
  - name (string) — REQUIRED: customer/company name
  - email (string) — OPTIONAL: contact email
  - phone (string) — OPTIONAL: contact phone
  - address (string) — OPTIONAL: billing/shipping address
- financials: OBJECT — REQUIRED: summarized monetary values
  - currency (string) — REQUIRED: e.g. "USD", "EUR"
  - subtotal (number) — REQUIRED: before discounts and taxes
  - discount (number) — OPTIONAL: absolute discount amount
  - tax (number) — OPTIONAL: tax amount
  - total (number) — REQUIRED: final payable amount
- items: ARRAY — OPTIONAL (recommended): summarized list of line items
  - [{ description (string), quantity (number), unitPrice (number), amount (number) }]
- notes (string) — OPTIONAL: customer-facing notes or terms
- pdfUrl (string) — OPTIONAL: URL where the generated PDF is available
- meta: OBJECT — OPTIONAL: internal metadata for reconciliation/tracing
  - createdBy (string) — e.g. user email or id
  - source (string) — e.g. "web-ui", "api"
  - webhookAttempt (number) — for the sender to annotate attempts if sending retries

Example minimal payload (quotation):

```json
{
  "id": "9f1b2f8a-...",
  "type": "quotation",
  "version": "1.0",
  "createdAt": "2025-09-13T10:25:30Z",
  "customer": { "name": "Acme Corp", "email": "acct@acme.example" },
  "financials": {
    "currency": "USD",
    "subtotal": 1200,
    "discount": 0,
    "tax": 120,
    "total": 1320
  },
  "items": [
    {
      "description": "Design work",
      "quantity": 10,
      "unitPrice": 120,
      "amount": 1200
    }
  ],
  "notes": "Valid for 30 days",
  "pdfUrl": "https://example.com/pdfs/9f1b2f8a.pdf",
  "meta": { "createdBy": "sales.agent@example.com", "source": "web-ui" }
}
```

Example minimal payload (invoice):

```json
{
  "id": "inv-2025-0004",
  "type": "invoice",
  "version": "1.0",
  "createdAt": "2025-09-13T10:30:12Z",
  "status": "sent",
  "customer": {
    "id": "cust-42",
    "name": "Beta LLC",
    "email": "pay@beta.example"
  },
  "financials": {
    "currency": "EUR",
    "subtotal": 5000,
    "discount": 200,
    "tax": 480,
    "total": 5280
  },
  "items": [
    {
      "description": "Hardware",
      "quantity": 5,
      "unitPrice": 1000,
      "amount": 5000
    }
  ],
  "notes": "Payment due in 30 days",
  "pdfUrl": "https://example.com/pdfs/inv-2025-0004.pdf",
  "meta": { "createdBy": "office.user@example.com", "source": "api" }
}
```

### Suggested Google Sheets mapping

One row per document. Basic column suggestions (A..M):

- A: id
- B: type
- C: createdAt
- D: status
- E: customerName
- F: customerEmail
- G: subtotal
- H: discount
- I: tax
- J: total
- K: currency
- L: pdfUrl
- M: notes

If `items` must be stored, consider storing a compact JSON string in a column like `itemsJson`, or having a separate sheet for line items referencing the parent `id`.

### Assumptions made

- The app generates a unique `id` for each created document.
- Google Sheets will receive POST requests with JSON payloads and an Apps Script or server will parse and append rows.
- The sheet will be used for human-readable ledger and light reporting, not as a source of truth for complex relational queries.
- PDF hosting is available (S3, static host, or generated temporary link). If not, `pdfUrl` can be omitted and the sheet can store a local filename.

### UI & integrations

- Styling: this project will use Tailwind CSS for utilities and DaisyUI for ready-made components and themes. Tailwind speeds up responsive layout and DaisyUI provides accessible components for the form and preview pages.
- Integrations: for richer integration flows (transformations, multi-step workflows, or connecting to other services) use n8n. The Next.js app sends compact webhook payloads to an n8n webhook endpoint (or directly to the Google Sheets receiver). n8n can orchestrate calls to Sheets, email, Slack, CRMs, or other systems and handle retries, transformations, and authentication.

### Security and validation recommendations

- Use a shared secret header or HMAC signature so the receiver can verify the webhook origin.
- Require HTTPS endpoints for the sheet webhook.
- Validate required fields server-side before sending the webhook (id, type, createdAt, customer.name, financials.currency, financials.total).
- Rate-limit and retry with exponential backoff on 5xx/timeout responses.

### Retry and delivery

- Sender should retry failed attempts (network failures or 5xx) with exponential backoff and a max attempts limit (e.g., 5 attempts).
- Include `webhookAttempt` in `meta` or keep server-side logs for debugging.

### Versioning

- Include `version` in the payload.
- When changing the schema, bump the version (e.g., 1.1) and maintain backward-compatibility when possible.

### Next steps for implementers

1. Finalize required fields for your business needs (tax breakdown, payment terms, salesperson, project id).
2. Implement a small webhook receiver (Apps Script or Node/Express) using the sample mapping above and test with example payloads.
3. Add HMAC signing and verification to the sender & receiver.
4. Optionally: add a separate sheet for line items if you need item-level reporting.

---

Document created: 2025-09-13
