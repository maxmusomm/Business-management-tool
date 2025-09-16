"use client";

import { useState, useRef, useEffect } from "react";
import { quotationHtmlTemplate } from "../../../lib/quotation-template";

export default function NewQuotationPage() {
  const [quotationNumber, setQuotationNumber] = useState("#QT-2025-001");
  const [quoteDate, setQuoteDate] = useState<string>(
    new Date().toLocaleDateString()
  );
  const [validUntil, setValidUntil] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30 Days");
  const [project, setProject] = useState("");
  const [billToJson, setBillToJson] = useState<string>(
    JSON.stringify(
      {
        name: "John Smith",
        company: "ABC Corporation",
        addressLine1: "123 Business Street",
        addressLine2: "City, State 12345",
        phone: "(555) 123-4567",
        email: "john@abccorp.com",
      },
      null,
      2
    )
  );

  const [fromJson, setFromJson] = useState<string>(
    JSON.stringify(
      {
        name: "Your Company Name",
        addressLine1: "456 Service Avenue",
        addressLine2: "Business City, State 67890",
        phone: "(555) 987-6543",
        email: "info@yourcompany.com",
      },
      null,
      2
    )
  );

  const [itemsJson, setItemsJson] = useState<string>(
    JSON.stringify(
      [
        {
          title: "Website Design & Development",
          description: "Custom responsive design",
          qty: 1,
          unitPrice: 2500,
        },
      ],
      null,
      2
    )
  );

  const [items, setItems] = useState<
    { title: string; description?: string; qty: number; unitPrice: number }[]
  >([
    {
      title: "Website Design & Development",
      description: "Custom responsive design",
      qty: 1,
      unitPrice: 2500,
    },
  ]);

  const [taxRate, setTaxRate] = useState<string>("0.085");
  const [termsText, setTermsText] = useState<string>(
    [
      "Payment is due within 30 days of invoice date",
      "50% deposit required before project commencement",
    ].join("\n")
  );

  const [logoUrl, setLogoUrl] = useState<string>("/img/vendeta_logo.png");

  const [html, setHtml] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    generateHtml();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function safeParse<T>(s: string, fallback: T): T {
    try {
      const v = JSON.parse(s);
      return v as T;
    } catch (e) {
      return fallback;
    }
  }

  function itemsStateForGenerate() {
    // prefer structured items state; fallback to JSON textarea if items is empty
    if (items && items.length) return items;
    return safeParse(itemsJson, [] as any[]);
  }

  function updateItem(
    index: number,
    patch: Partial<{
      title: string;
      description?: string;
      qty: number;
      unitPrice: number;
    }>
  ) {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch } as any;
      return copy;
    });
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { title: "", description: "", qty: 1, unitPrice: 0 },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const tax = +(subtotal * (Number(taxRate) || 0)).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  function generateHtml() {
    const billTo = safeParse(billToJson, {});
    const from = safeParse(fromJson, {});
    const items = itemsStateForGenerate();
    const terms = termsText
      .split(/\r?\n/)
      .map((t) => t.trim())
      .filter(Boolean);

    const data = {
      quotationNumber,
      quoteDate,
      validUntil,
      paymentTerms,
      project,
      billTo,
      from,
      items,
      taxRate: Number(taxRate) || 0,
      terms,
      logoUrl,
    } as any;

    const generated = quotationHtmlTemplate(data);
    setHtml(generated);

    if (iframeRef.current) {
      const doc =
        iframeRef.current.contentDocument ||
        iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(generated);
        doc.close();
      }
    }
  }

  function openInNewTab() {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  async function downloadHtml() {
    // Prepare data used for PDF generation
    const data = {
      quotationNumber,
      quoteDate,
      validUntil,
      paymentTerms,
      project,
      billTo: safeParse(billToJson, {}),
      from: safeParse(fromJson, {}),
      items: itemsStateForGenerate(),
      taxRate: Number(taxRate) || 0,
      terms: termsText
        .split(/\r?\n/)
        .map((t) => t.trim())
        .filter(Boolean),
      logoUrl,
    };

    // Best-effort: save metadata to the backend before generating PDF
    try {
      await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          subtotal: subtotal,
          tax: tax,
          total: total,
        }),
      });
    } catch (err) {
      // non-fatal: log and continue to PDF generation
      console.warn("Warning: saving quotation metadata failed", err);
    }

    // Request PDF generation and download
    try {
      const res = await fetch("/api/quotations/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quotationNumber.replace(/[^a-z0-9\-_.]/gi, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF. Check server logs.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-4">Create Quotation</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-3">
          <label className="block">
            <div className="text-sm font-medium">Quotation Number</div>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={quotationNumber}
              onChange={(e) => setQuotationNumber(e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Quote Date</div>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Valid Until</div>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Payment Terms</div>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Project</div>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={project}
              onChange={(e) => setProject(e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Logo URL</div>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </label>

          <div className="block">
            <div className="flex gap-2 mt-3">
              <button
                onClick={generateHtml}
                className="btn btn-outline btn-warning rounded"
              >
                Generate
              </button>
              <button
                onClick={openInNewTab}
                className="btn btn-outline btn-error rounded"
              >
                Open
              </button>
              <button
                onClick={downloadHtml}
                className="btn btn-outline btn-error rounded"
              >
                Download
              </button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div>
            <div className="text-sm font-medium">Bill To (JSON)</div>
            <textarea
              rows={6}
              className="mt-1 w-full rounded border px-3 py-2 font-mono text-sm"
              value={billToJson}
              onChange={(e) => setBillToJson(e.target.value)}
            />
          </div>

          <div>
            <div className="text-sm font-medium">From (JSON)</div>
            <textarea
              rows={4}
              className="mt-1 w-full rounded border px-3 py-2 font-mono text-sm"
              value={fromJson}
              onChange={(e) => setFromJson(e.target.value)}
            />
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Products / Items</div>
            <div className="overflow-x-auto border rounded">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left text-black">Description</th>
                    <th className="p-2 text-left text-black">Notes</th>
                    <th className="p-2 text-center text-black">Qty</th>
                    <th className="p-2 text-right text-black">Unit Price</th>
                    <th className="p-2 text-right text-black">Total</th>
                    <th className="p-2 text-black"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 w-1/3">
                        <input
                          value={it.title}
                          onChange={(e) =>
                            updateItem(idx, { title: e.target.value })
                          }
                          className="w-full rounded border px-2 py-1"
                        />
                      </td>
                      <td className="p-2 w-2/5">
                        <textarea
                          rows={3}
                          value={it.description ?? ""}
                          onChange={(e) => {
                            updateItem(idx, { description: e.target.value });
                            // autosize: adjust height to content
                            const ta = e.target as HTMLTextAreaElement;
                            ta.style.height = "auto";
                            ta.style.height = `${ta.scrollHeight}px`;
                          }}
                          className="w-full rounded border px-2 py-1 resize-y"
                        />
                      </td>
                      <td className="p-2 text-center w-20">
                        <input
                          type="number"
                          value={it.qty}
                          onChange={(e) =>
                            updateItem(idx, {
                              qty: Number(e.target.value) || 0,
                            })
                          }
                          className="w-20 rounded border px-2 py-1 text-center"
                        />
                      </td>
                      <td className="p-2 text-right w-36">
                        <input
                          type="number"
                          value={it.unitPrice}
                          onChange={(e) =>
                            updateItem(idx, {
                              unitPrice: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded border px-2 py-1 text-right"
                        />
                      </td>
                      <td className="p-2 text-right w-36">
                        ${(it.qty * it.unitPrice).toFixed(2)}
                      </td>
                      <td className="p-2 text-center w-20">
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-sm text-red-600"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="p-2" colSpan={3} />
                    <td className="p-2 text-right font-medium">Subtotal</td>
                    <td className="p-2 text-right font-medium">
                      ${subtotal.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                  <tr>
                    <td className="p-2" colSpan={3} />
                    <td className="p-2 text-right">Tax</td>
                    <td className="p-2 text-right">${tax.toFixed(2)}</td>
                    <td />
                  </tr>
                  <tr>
                    <td className="p-2" colSpan={3} />
                    <td className="p-2 text-right font-bold bg-gray-50 text-black">
                      Total
                    </td>
                    <td className="p-2 text-right font-bold bg-gray-50 text-black">
                      ${total.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-2 flex gap-3">
              <button
                onClick={addItem}
                className="btn btn-soft btn-accent rounded"
              >
                Add Item
              </button>
              <button
                onClick={() => setItemsJson(JSON.stringify(items, null, 2))}
                className="btn btn-soft btn-info rounded"
              >
                Sync JSON
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Tax Rate (decimal)</div>
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </div>
            <div>
              <div className="text-sm font-medium">Terms (one per line)</div>
              <textarea
                rows={3}
                className="mt-1 w-full rounded border px-3 py-2 font-mono text-sm"
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">Preview</div>
            <div className="mt-2 border">
              <iframe
                ref={iframeRef}
                title="Quotation Preview"
                className="w-full h-[600px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
