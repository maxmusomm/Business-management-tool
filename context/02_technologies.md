## Technologies and process overview

This file describes the primary technologies chosen for the Quotation & Invoice Maker application and the high-level runtime flow from user input to generated document (HTML or PDF).

### Primary technologies

- Next.js — framework (React + server rendering + API routes)

  - Full-stack React framework that supports server-side rendering (SSR), static pages, and API routes. It removes the need to run a separate Express server for typical web apps.
  - Responsibilities in this app: serve the UI (React pages), host API routes for form submission and webhook posting, and provide server-side rendering for previews or PDF-friendly HTML. Use Next.js API routes (under `pages/api/`) to accept POSTs and trigger webhook logic.

- EJS — optional templating/rendering library
  - While Next.js uses React components for UI, you can still use EJS (or plain HTML templates) server-side inside Next.js API routes to render HTML strings specifically optimized for PDF generation. Alternatively prefer React components/pages for previews and use the same markup for PDF rendering.
  - EJS templates (if used) are useful for quick, compact HTML generation for third-party PDF pipelines.

Optional/adjacent libraries (examples used in the repo/tests):

- html-pdf-node or Puppeteer — to generate PDFs from rendered HTML. The `tests/index.js` demonstrates converting an HTML string to `output.pdf` using `html-pdf-node`.
- pdf-lib — for light PDF manipulation if needed.
- node-fetch/axios — to POST webhook payloads to the Google Sheets receiver.

### Styling and UI

- Tailwind CSS — utility-first CSS framework. Use it to style React pages and rapidly build responsive layouts.
- DaisyUI — component library built on Tailwind that provides pre-styled UI components (buttons, forms, modals) and themes. Good for fast UI composition in the Next.js pages.

Typical setup: install Tailwind and DaisyUI, add Tailwind config and PostCSS, then use classes in your React components. You already installed `tailwindcss` and `daisyui` (per your terminal output) — create `tailwind.config.js` and include DaisyUI plugin.

### High-level process (UI -> document)

1. User chooses document type: "quotation" or "invoice".
2. Server serves a form page (EJS template). The form contains fields for customer, items (repeating rows), currency, dates, notes, etc.
3. User fills the form and presses Submit. The browser sends a POST request to a Next.js API route (e.g. `POST /api/generate`).
4. The server validates required fields.
5. The server composes a data object (document model) from the form values. This object includes: id (generated), type, createdAt, customer, items, financials, notes, meta.
6. The server (Next.js API route or server-side function) renders HTML using either React components or an EJS template into an HTML string using the document model. You can generate multiple templates (one for quotation, one for invoice) or a single template with conditional logic.
7. The rendered HTML can be:
   - Sent directly as HTML response to the user (preview).
   - Converted to PDF using `html-pdf-node`/Puppeteer and returned as a downloadable file or stored on a static host.
8. The Next.js API route sends a webhook POST to the configured Google Sheets receiver with a compact JSON payload (see `main-context.md` for the suggested schema).

### Example flow mapped to project files

- `pages/` — Next.js pages (e.g., `pages/index.tsx` shows the form, `pages/preview.tsx` shows a preview). Use `getServerSideProps`/API routes when server data is required.
- `pages/api/` — API routes for form submission and server-side generation (e.g., `pages/api/generate.ts`); these routes implement the webhook sender and optionally the PDF generation.
- `components/` — React components used in the UI and in server-rendered previews.
- `public/` — static assets (CSS, images like `img/vendeta_logo.png`).
- `tests/index.js` — a minimal example that reads an HTML string (from `tests/html.js`) and generates `output.pdf` using `html-pdf-node`. Useful as a reference and smoke test for the PDF pipeline.

### Points to consider / best practices

- Validation: ensure required fields are present before rendering or sending webhooks.
- Security: use HTTPS in production; sign webhooks with an HMAC or use a shared secret header.
- Performance: convert to PDF asynchronously when possible; for large numbers of exports, queue generation using a background job (e.g., Bull + Redis).
- Templating: keep templates small and maintainable—use partials for header, footer, and line-items.
- Accessibility: generated HTML should be semantic for readability in previews and for potential machine parsing.

### Small example snippets

Render HTML server-side in a Next.js API route and return PDF (pseudo-code):

```js
// pages/api/generate.js (or .ts)
import fs from "fs";
import ejs from "ejs";
import { generatePdf } from "../../lib/pdf"; // wrapper around html-pdf-node or puppeteer

export default async function handler(req, res) {
  const data = req.body;
  // Option A: Render EJS template into HTML string
  const html = ejs.render(
    fs.readFileSync("./templates/quotation.ejs", "utf8"),
    data
  );
  const pdfBuffer = await generatePdf(html);
  res.setHeader("Content-Type", "application/pdf");
  res.send(pdfBuffer);
}
```

Generate unique id (example):

```js
import { v4 as uuidv4 } from "uuid";
const id = `q-${uuidv4()}`;
```

### Next steps I can help with

- Create minimal Next.js pages and API routes: a React form page (`pages/index.tsx`) and `pages/api/generate.ts` to handle submissions and PDF/webhook logic.
- Build React components styled with Tailwind and DaisyUI for the form and preview, or EJS templates if preferred for PDF rendering.
- Implement a sample webhook sender and a stub receiver (Apps Script or small Express/n8n endpoint).
- Wire PDF generation using Puppeteer or `html-pdf-node` and add a download/preview route.
