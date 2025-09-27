"use client";

import { useState, useRef, useEffect } from "react";
import { quotationHtmlTemplate } from "../../../lib/quotation-template";

export default function NewQuotationPage() {
  const [quotationNumber, setQuotationNumber] = useState(
    `#QT-$${new Date().getTime().toString()}`
  );
  const [quoteDate, setQuoteDate] = useState<string>(new Date().toISOString());
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

  // Structured form state for Bill To / From (keeps JSON in sync)
  const [billTo, setBillTo] = useState<any>(() => {
    try {
      return JSON.parse(billToJson);
    } catch (e) {
      return {};
    }
  });

  const [from, setFrom] = useState<any>(() => {
    try {
      return JSON.parse(fromJson);
    } catch (e) {
      return {};
    }
  });

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

  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  const [html, setHtml] = useState<string>("");
  const [showProceedCard, setShowProceedCard] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>(`Quotation`);
  const [message, setMessage] = useState<string>(
    `Quotation for ${project || "your project"}`
  );
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
      logoUrl: logoDataUrl ?? "",
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

  // convert selected image file to data URL
  async function handleLogoFile(file?: File | null) {
    if (!file) {
      setLogoDataUrl(null);
      return;
    }
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string | null;
        if (result) setLogoDataUrl(result);
        resolve();
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  function isValidEmail(email: string) {
    return /^\S+@\S+\.\S+$/.test(email.trim());
  }

  function arrayBufferToBase64(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  }

  async function sendEmail() {
    setSendError(null);
    if (!recipients.length) {
      setSendError("Add at least one recipient");
      return;
    }
    setSendLoading(true);
    try {
      // ensure HTML up to date
      generateHtml();
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
        logoUrl: logoDataUrl ?? "",
      };

      // Attempt to save quotation metadata before generating PDF/send so DB has a record
      let saved = false;
      try {
        const saveRes = await fetch("/api/quotations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            subtotal: subtotal,
            tax: tax,
            total: total,
          }),
        });
        if (saveRes.ok) saved = true;
        else console.warn("Pre-send save returned non-ok", saveRes.status);
      } catch (e) {
        console.warn("Pre-send save failed:", e);
      }

      const pdfRes = await fetch("/api/quotations/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!pdfRes.ok) throw new Error("PDF generation failed");
      const pdfBuf = await pdfRes.arrayBuffer();
      const attachmentBase64 = arrayBufferToBase64(pdfBuf);

      const sendRes = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          subject,
          message,
          filename: `${quotationNumber.replace(/[^a-z0-9\-_.]/gi, "_")}.pdf`,
          attachmentBase64,
          metadata: { quotationNumber },
        }),
      });

      if (!sendRes.ok) {
        if (sendRes.status === 401) {
          setSendError("Authentication required. Please authorize Google.");
        } else if (sendRes.status === 404) {
          setSendError("Send endpoint not implemented on server (404).");
        } else {
          const t = await sendRes.text();
          setSendError(t || `Failed to send email (${sendRes.status})`);
        }
        return;
      }
      // If pre-send save failed, try again now that send succeeded
      if (!saved) {
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
          console.warn("Post-send save also failed", err);
        }
      }
      setShowEmailForm(false);
      alert("Email sent/queued successfully");
    } catch (err: any) {
      console.error(err);
      setSendError(err?.message || String(err));
    } finally {
      setSendLoading(false);
    }
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
      logoUrl: logoDataUrl,
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
              disabled
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
            <div className="text-sm font-medium">
              Upload Logo (from your machine)
            </div>
            <input
              type="file"
              accept="image/*"
              className="mt-1 w-full"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                handleLogoFile(f).catch((err) => console.error(err));
              }}
            />
            {logoDataUrl && (
              <div className="mt-2">
                <img src={logoDataUrl} alt="Logo preview" className="h-16" />
              </div>
            )}
          </label>

          <div className="block">
            <div className="flex gap-2 mt-3">
              <button
                onClick={generateHtml}
                className="btn btn-outline  rounded btn-warning"
              >
                Generate
              </button>
              <button
                onClick={() => setShowProceedCard(true)}
                className="btn btn-outline  rounded btn-primary"
              >
                Proceed
              </button>
            </div>

            {showProceedCard && (
              <div className="card bg-base-100 w-96 shadow-sm mt-4">
                <div className="card-body">
                  <h2 className="card-title">Actions</h2>
                  <p className="text-sm">
                    Choose an action for this quotation.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button onClick={downloadHtml} className="btn btn-primary">
                      Download
                    </button>
                    <button
                      onClick={() => {
                        setSubject("Quotation");
                        setMessage(
                          `Quotation for ${project || "your project"}`
                        );
                        setShowEmailForm(true);
                      }}
                      className="btn btn-secondary"
                    >
                      Send Via Email
                    </button>
                    <button
                      onClick={() => setShowProceedCard(false)}
                      className="btn"
                    >
                      Cancel
                    </button>
                  </div>

                  {showEmailForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setShowEmailForm(false)}
                      />
                      <div className="card bg-base-100 w-96 shadow-sm z-50">
                        <div className="card-body">
                          <h2 className="card-title">Send Email</h2>
                          <div className="text-sm mb-2">Recipients</div>
                          <div className="flex gap-2">
                            <input
                              value={recipientInput}
                              onChange={(e) =>
                                setRecipientInput(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const email = recipientInput.trim();
                                  if (!email) return;
                                  if (!isValidEmail(email)) {
                                    setSendError(
                                      "Enter a valid email address."
                                    );
                                    return;
                                  }
                                  setRecipients((r) =>
                                    r.includes(email) ? r : [...r, email]
                                  );
                                  setRecipientInput("");
                                  setSendError(null);
                                }
                              }}
                              placeholder="Enter email and press Add"
                              className="input input-bordered flex-1"
                            />
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => {
                                const email = recipientInput.trim();
                                if (!email) return;
                                if (!isValidEmail(email)) {
                                  setSendError("Enter a valid email address.");
                                  return;
                                }
                                setRecipients((r) =>
                                  r.includes(email) ? r : [...r, email]
                                );
                                setRecipientInput("");
                                setSendError(null);
                              }}
                            >
                              Add
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {recipients.map((r) => (
                              <div
                                key={r}
                                className="badge badge-outline flex items-center gap-2"
                              >
                                <span>{r}</span>
                                <button
                                  onClick={() =>
                                    setRecipients((arr) =>
                                      arr.filter((x) => x !== r)
                                    )
                                  }
                                  className="btn btn-xs btn-ghost"
                                  aria-label={`Remove ${r}`}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>

                          {sendError && (
                            <div className="mt-2 text-sm text-red-600">
                              {sendError}
                              {sendError.toLowerCase().includes("auth") && (
                                <div className="mt-2">
                                  <a
                                    href="/api/gmail/auth"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-xs btn-outline  rounded"
                                  >
                                    Authorize Google
                                  </a>
                                  <span className="ml-2 text-xs text-gray-600">
                                    (opens consent in new tab)
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-4">
                            <div className="text-sm">Subject</div>
                            <input
                              value={subject}
                              onChange={(e) => setSubject(e.target.value)}
                              className="input input-bordered w-full mt-1"
                            />
                          </div>

                          <div className="mt-4">
                            <div className="text-sm">Message</div>
                            <textarea
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              className="textarea textarea-bordered w-full mt-1"
                              rows={4}
                            />
                          </div>

                          <div className="card-actions justify-end mt-4">
                            <button
                              className={`btn btn-primary ${
                                sendLoading ? "loading" : ""
                              }`}
                              onClick={() => sendEmail()}
                              disabled={sendLoading || recipients.length === 0}
                            >
                              {sendLoading ? "Sending..." : "Send"}
                            </button>
                            <button
                              className="btn"
                              onClick={() => setShowEmailForm(false)}
                              disabled={sendLoading}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div>
            <div className="text-sm font-medium">Bill To</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
              <input
                className="input input-bordered w-full"
                placeholder="Name"
                value={billTo.name || ""}
                onChange={(e) => {
                  const v = { ...billTo, name: e.target.value };
                  setBillTo(v);
                  setBillToJson(JSON.stringify(v, null, 2));
                }}
              />
              <input
                className="input input-bordered w-full"
                placeholder="Company"
                value={billTo.company || ""}
                onChange={(e) => {
                  const v = { ...billTo, company: e.target.value };
                  setBillTo(v);
                  setBillToJson(JSON.stringify(v, null, 2));
                }}
              />
              <input
                className="input input-bordered w-full"
                placeholder="Address line 1"
                value={billTo.addressLine1 || ""}
                onChange={(e) => {
                  const v = { ...billTo, addressLine1: e.target.value };
                  setBillTo(v);
                  setBillToJson(JSON.stringify(v, null, 2));
                }}
              />
              <input
                className="input input-bordered w-full"
                placeholder="Address line 2"
                value={billTo.addressLine2 || ""}
                onChange={(e) => {
                  const v = { ...billTo, addressLine2: e.target.value };
                  setBillTo(v);
                  setBillToJson(JSON.stringify(v, null, 2));
                }}
              />
              <input
                className="input input-bordered w-full"
                placeholder="Phone"
                value={billTo.phone || ""}
                onChange={(e) => {
                  const v = { ...billTo, phone: e.target.value };
                  setBillTo(v);
                  setBillToJson(JSON.stringify(v, null, 2));
                }}
              />
              <input
                className="input input-bordered w-full"
                placeholder="Email"
                value={billTo.email || ""}
                onChange={(e) => {
                  const v = { ...billTo, email: e.target.value };
                  setBillTo(v);
                  setBillToJson(JSON.stringify(v, null, 2));
                }}
              />
            </div>
            <div className="mt-2">
              <div className="text-xs text-gray-700">Raw JSON (editable)</div>
              <textarea
                rows={4}
                className="mt-1 w-full rounded border px-3 py-2 font-mono text-sm"
                value={billToJson}
                onChange={(e) => {
                  setBillToJson(e.target.value);
                  try {
                    setBillTo(JSON.parse(e.target.value));
                  } catch (_) {}
                }}
              />
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">From</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
              <input
                className="input input-bordered w-full"
                placeholder="Name"
                value={from.name || ""}
                onChange={(e) => {
                  const v = { ...from, name: e.target.value };
                  setFrom(v);
                  setFromJson(JSON.stringify(v, null, 2));
                }}
              />
              <input
                className="input input-bordered w-full"
                placeholder="Address line 1"
                value={from.addressLine1 || ""}
                onChange={(e) => {
                  const v = { ...from, addressLine1: e.target.value };
                  setFrom(v);
                  setFromJson(JSON.stringify(v, null, 2));
                }}
              />
              <input
                className="input input-bordered w-full"
                placeholder="Address line 2"
                value={from.addressLine2 || ""}
                onChange={(e) => {
                  const v = { ...from, addressLine2: e.target.value };
                  setFrom(v);
                  setFromJson(JSON.stringify(v, null, 2));
                }}
              />
              <input
                className="input input-bordered w-full"
                placeholder="Phone"
                value={from.phone || ""}
                onChange={(e) => {
                  const v = { ...from, phone: e.target.value };
                  setFrom(v);
                  setFromJson(JSON.stringify(v, null, 2));
                }}
              />
              <input
                className="input input-bordered w-full"
                placeholder="Email"
                value={from.email || ""}
                onChange={(e) => {
                  const v = { ...from, email: e.target.value };
                  setFrom(v);
                  setFromJson(JSON.stringify(v, null, 2));
                }}
              />
            </div>
            <div className="mt-2">
              <div className="text-xs text-gray-700">Raw JSON (editable)</div>
              <textarea
                rows={3}
                className="mt-1 w-full rounded border px-3 py-2 font-mono text-sm"
                value={fromJson}
                onChange={(e) => {
                  setFromJson(e.target.value);
                  try {
                    setFrom(JSON.parse(e.target.value));
                  } catch (_) {}
                }}
              />
            </div>
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
