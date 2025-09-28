"use client";

import { useState, useRef, useEffect } from "react";
import { quotationHtmlTemplate } from "../../../lib/quotation-template";

export default function NewInvoicePage() {
  const [invoiceNumber, setInvoiceNumber] = useState(
    `#IN-${new Date().getTime().toString()}`
  );
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString()
  );
  const [dueDate, setDueDate] = useState<string>("");
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
      "Thank you for your business",
    ].join("\n")
  );

  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  const [html, setHtml] = useState<string>("");
  const [showProceedCard, setShowProceedCard] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>(`Invoice`);
  const [message, setMessage] = useState<string>(
    `Invoice for ${project || "your project"}`
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

  function isValidEmail(email: string) {
    return /^\S+@\S+\.\S+$/.test(email.trim());
  }

  function validateInvoice(forSending = false) {
    const errors: string[] = [];
    if (!invoiceNumber || !invoiceNumber.trim()) {
      errors.push("Invoice number is required.");
    }
    if (!items || items.length === 0) {
      errors.push("At least one invoice item is required.");
    } else {
      items.forEach((it, idx) => {
        if (!it.title || !it.title.trim()) {
          errors.push(`Item ${idx + 1} is missing a description/title.`);
        }
        if (typeof it.qty !== "number" || it.qty <= 0) {
          errors.push(`Item ${idx + 1} must have quantity > 0.`);
        }
        if (typeof it.unitPrice !== "number" || it.unitPrice < 0) {
          errors.push(`Item ${idx + 1} must have unit price >= 0.`);
        }
      });
    }
    if (forSending && (!recipients || recipients.length === 0)) {
      errors.push("Specify at least one recipient to send the invoice.");
    }
    return { ok: errors.length === 0, errors };
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
    setItems((prev) => {
      if (prev.length <= 1) return prev; // keep at least one item
      return prev.filter((_, i) => i !== index);
    });
  }

  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const tax = +(subtotal * (Number(taxRate) || 0)).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  function itemsStateForGenerate() {
    return items;
  }

  function generateHtml() {
    const terms = termsText
      .split(/\r?\n/)
      .map((t) => t.trim())
      .filter(Boolean);

    const data = {
      quotationNumber: invoiceNumber,
      quoteDate: invoiceDate,
      validUntil: dueDate,
      paymentTerms,
      project,
      billTo,
      from,
      items,
      taxRate: Number(taxRate) || 0,
      terms,
      // prefer embedded base64 image when present
      logoUrl: logoDataUrl ?? "",
      companyContactEmail: (from as any).email,
      companyContactPhone: (from as any).phone,
    } as any;

    const generated = quotationHtmlTemplate(data, { titleText: "INVOICE" });
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

  async function downloadPdf() {
    setDownloadError(null);
    const v = validateInvoice(false);
    if (!v.ok) {
      setDownloadError(v.errors.join(" "));
      return;
    }
    setDownloadLoading(true);
    const data = {
      quotationNumber: invoiceNumber,
      quoteDate: invoiceDate,
      validUntil: dueDate,
      paymentTerms,
      project,
      billTo: billTo,
      from: from,
      items: items,
      taxRate: Number(taxRate) || 0,
      terms: termsText
        .split(/\r?\n/)
        .map((t) => t.trim())
        .filter(Boolean),
      // prefer embedded base64 image when present
      logoUrl: logoDataUrl ?? "",
    };

    // Best-effort: save invoice metadata to backend before PDF
    try {
      await fetch("/api/invoices", {
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
      console.warn("Warning: saving invoice metadata failed", err);
    }

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
      a.download = `${invoiceNumber.replace(/[^a-z0-9\-_.]/gi, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setDownloadError((err as Error)?.message || String(err));
      alert("Failed to generate PDF. Check server logs.");
    } finally {
      setDownloadLoading(false);
    }
  }

  // Convert ArrayBuffer to base64 safely
  function arrayBufferToBase64(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000; // arbitrary
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
  }

  async function sendEmail() {
    setSendError(null);
    const v = validateInvoice(true);
    if (!v.ok) {
      setSendError(v.errors.join(" "));
      return;
    }
    if (recipients.length === 0) {
      setSendError("No recipients specified.");
      return;
    }
    setSendLoading(true);
    try {
      // Re-generate HTML to ensure preview is up to date
      generateHtml();
      // Request PDF from server
      // Prepare data used for save/PDF generation (use the structured state)
      // billTo and from are React state variables declared above
      const terms = termsText
        .split(/\r?\n/)
        .map((t) => t.trim())
        .filter(Boolean);

      const data = {
        quotationNumber: invoiceNumber,
        quoteDate: invoiceDate,
        validUntil: dueDate,
        paymentTerms,
        project,
        billTo,
        from,
        items,
        taxRate: Number(taxRate) || 0,
        terms: termsText
          .split(/\r?\n/)
          .map((t) => t.trim())
          .filter(Boolean),
      } as any;

      // Attempt to save invoice metadata before generating PDF/send so DB has a record
      let saved = false;
      try {
        const saveRes = await fetch("/api/invoices", {
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
        body: JSON.stringify({
          quotationNumber: invoiceNumber,
          quoteDate: invoiceDate,
          validUntil: dueDate,
          paymentTerms,
          project,
          billTo,
          from,
          items,
          taxRate: Number(taxRate) || 0,
          terms: termsText
            .split(/\r?\n/)
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (!pdfRes.ok) {
        if (pdfRes.status === 404) {
          throw new Error("PDF endpoint not found on server.");
        }
        throw new Error(`PDF generation failed (${pdfRes.status})`);
      }
      const pdfBuf = await pdfRes.arrayBuffer();
      const attachmentBase64 = arrayBufferToBase64(pdfBuf);

      // Post to send API
      const sendRes = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          subject,
          message,
          filename: `${invoiceNumber.replace(/[^a-z0-9\-_.]/gi, "_")}.pdf`,
          attachmentBase64,
          metadata: {
            invoiceNumber,
            subtotal,
            tax,
            total,
          },
        }),
      });

      if (!sendRes.ok) {
        if (sendRes.status === 404) {
          setSendError("Send endpoint not implemented on the server (404).");
        } else if (sendRes.status === 401) {
          setSendError(
            "Authentication required. Please configure Gmail OAuth."
          );
        } else {
          const text = await sendRes.text();
          setSendError(text || `Failed to send email (${sendRes.status})`);
        }
        return;
      }

      // success
      setSendError(null);
      setShowEmailForm(false);
      alert("Email queued/sent successfully.");

      // If pre-send save failed, try saving now
      if (!saved) {
        try {
          await fetch("/api/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...data,
              subtotal: subtotal,
              tax: tax,
              total: total,
            }),
          });
        } catch (e) {
          console.warn("Post-send save also failed", e);
        }
      }
    } catch (err) {
      console.error(err);
      setSendError((err as Error)?.message || String(err));
    } finally {
      setSendLoading(false);
    }
  }

  return (
    // DaisyUI component references:
    // - Textarea: https://daisyui.com/components/textarea/
    // - Navbar: https://daisyui.com/components/navbar/
    // - Button: https://daisyui.com/components/button/
    // - Card: https://daisyui.com/components/card/
    // - Dropdown: https://daisyui.com/components/dropdown/
    // - Fieldset: https://daisyui.com/components/fieldset/
    // - File input: https://daisyui.com/components/file-input/
    // - Input: https://daisyui.com/components/input/

    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-4">Create Invoice</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-3">
          <label className="block">
            <div className="text-sm font-medium">Invoice Number</div>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              disabled
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Invoice Date</div>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Due Date</div>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
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
            {/* Notice about email sending limitations */}
            <div className="mb-3">
              <div className="alert alert-info shadow-lg">
                <div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current flex-shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.142 0 7.5-3.358 7.5-7.5S16.142 5.5 12 5.5 4.5 8.858 4.5 13 7.858 20.5 12 20.5z"
                    />
                  </svg>
                  <span>
                    Email send is only available for authorized accounts. To
                    enable sending from your email address, contact the
                    developer to configure Gmail authorization for your account.
                    Otherwise, use the Download action to save the PDF locally.
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={generateHtml}
                className="btn btn-outline btn-warning rounded"
              >
                Generate
              </button>
              <button
                onClick={() => setShowProceedCard(true)}
                className="btn btn-outline btn-primary rounded"
              >
                Proceed
              </button>
            </div>

            {/* Inline validation summary for quick feedback */}
            {(() => {
              const v = validateInvoice(false);
              if (!v.ok) {
                return (
                  <div className="mt-2 text-sm text-yellow-700">
                    {v.errors.slice(0, 2).join(" ")}
                    {v.errors.length > 2 ? "..." : ""}
                  </div>
                );
              }
              return null;
            })()}

            {showProceedCard && (
              <div className="card bg-base-100 w-96 shadow-sm mt-4">
                <div className="card-body">
                  <h2 className="card-title">Actions</h2>
                  <p className="text-sm">Choose an action for this invoice.</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={downloadPdf}
                      className={`btn btn-primary ${
                        downloadLoading ? "loading" : ""
                      }`}
                      disabled={downloadLoading}
                    >
                      {downloadLoading ? "Downloading..." : "Download"}
                    </button>
                    <button
                      onClick={() => {
                        setSubject("Invoice");
                        setMessage(`Invoice for ${project || "your project"}`);
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

                  {downloadError && (
                    <div className="mt-3 text-sm text-red-600">
                      {downloadError}
                    </div>
                  )}

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
                                    className="btn btn-xs btn-outline"
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
                              aria-disabled={
                                sendLoading || recipients.length === 0
                              }
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
                onClick={() => setItems(JSON.parse(JSON.stringify(items)))}
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
              <div className="text-sm font-medium">
                Notes / Terms (one per line)
              </div>
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
                title="Invoice Preview"
                className="w-full h-[600px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
