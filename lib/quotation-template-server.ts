import htmlToPdf from "html-pdf-node";
import fs from "fs/promises";

/**
 * Server-only PDF helpers. Kept separate so the client bundle doesn't import
 * Node-only modules (puppeteer/child_process) when importing the HTML template.
 */

const createPdfBuffer = async (html: string, options?: any) => {
  const file = { content: html };
  const opts = options ?? { format: "A4", scale: 1 };
  const pdfBuffer = await htmlToPdf.generatePdf(file, opts);
  return pdfBuffer as unknown as Buffer;
};

const createPdf = async (html: string) => {
  const pdfBuffer = await createPdfBuffer(html, { format: "A3", scale: 1.2 });
  await fs.writeFile("output.pdf", pdfBuffer);
  console.log("PDF generated to output.pdf");
};

export { createPdfBuffer, createPdf };
