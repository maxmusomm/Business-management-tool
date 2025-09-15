import type { NextRequest } from "next/server";
import { quotationHtmlTemplate } from "../../../../lib/quotation-template";
import { createPdfBuffer } from "../../../../lib/quotation-template-server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const html = quotationHtmlTemplate(data);
    const pdfBuffer = await createPdfBuffer(html, { format: "A4", scale: 1 });

    // Node Buffer -> ArrayBuffer for Response body
    const ab = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    );
    const uint8 = new Uint8Array(ab);
    // Copy into a plain ArrayBuffer to avoid SharedArrayBuffer typing issues
    const abCopy = new ArrayBuffer(uint8.length);
    new Uint8Array(abCopy).set(uint8);
    const blob = new Blob([abCopy], { type: "application/pdf" });
    return new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(
          data?.quotationNumber || "quotation"
        ).replace(/[^a-z0-9\-_.]/gi, "_")}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error", err);
    return new Response(JSON.stringify({ error: "PDF generation failed" }), {
      status: 500,
    });
  }
}
