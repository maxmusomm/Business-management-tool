"use server";
import { db } from "../src/db/client";
import { invoicesTable, quotationsTable } from "../src/db/schema";
import GmailAccountsDropdown from "./components/GmailAccountsDropdown";
import NavBar from "./components/NavBar";

type Activity = {
  id: number;
  date: string; // ISO string
  type: "Invoice" | "Quotation";
  amount: number; // in cents
  status: string;
  number?: string; // invoice_number or quotation_number
  clientName?: string;
  clientEmail?: string;
  clientCompany?: string;
  clientAddress1?: string;
  clientAddress2?: string;
  clientPhone?: string;
};

// Get Database activities
async function getRecentActivities() {
  // Server-side: query the DB directly to avoid using fetch in server runtime
  const [invoices, quotations] = await Promise.all([
    db.select().from(invoicesTable).limit(16),
    db.select().from(quotationsTable).limit(16),
  ]);

  const recentActivity: any[] = [...invoices, ...quotations];

  // Sort ascending by created_at (oldest first)
  recentActivity.sort((a, b) => {
    const ta = a.created_at ? new Date(String(a.created_at)).getTime() : 0;
    const tb = b.created_at ? new Date(String(b.created_at)).getTime() : 0;
    return ta - tb;
  });

  const mapped: Activity[] = recentActivity.map((row: any) => {
    const isInvoice = !!row.invoice_number;
    const isQuotation = !!row.quotation_number;
    const date = row.created_at ?? row.issued_at ?? new Date().toISOString();
    const amount = row.total_cents ?? row.total ?? 0;
    const status = row.status ?? "draft";
    const id = row.id ?? Math.floor(Math.random() * 1e9);
    const number = isInvoice
      ? row.invoice_number
      : isQuotation
      ? row.quotation_number
      : undefined;
    // Parse bill_to (may be JSON string or an object)
    let billTo: any = row.bill_to ?? null;
    if (billTo && typeof billTo === "string") {
      try {
        billTo = JSON.parse(billTo);
      } catch (e) {
        // ignore parse error
      }
    }
    const clientName = billTo ? billTo.name || undefined : undefined;
    const clientCompany = billTo ? billTo.company || undefined : undefined;
    const clientAddress1 = billTo
      ? billTo.addressLine1 || undefined
      : undefined;
    const clientAddress2 = billTo
      ? billTo.addressLine2 || undefined
      : undefined;
    const clientPhone = billTo ? billTo.phone || undefined : undefined;
    const clientEmail = billTo ? billTo.email || undefined : undefined;
    return {
      id,
      date: typeof date === "string" ? date : String(date),
      type: isInvoice ? "Invoice" : "Quotation",
      amount: typeof amount === "number" ? amount : Number(amount) || 0,
      status,
      number,
      clientName,
      clientEmail,
      clientCompany,
      clientAddress1,
      clientAddress2,
      clientPhone,
    } as Activity;
  });

  return mapped;
}

function formatMoney(cents: number, currency = "ZMW") {
  const value = cents / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export default async function Home() {
  const activities = await getRecentActivities();

  return (
    <div className="min-h-screen p-6 sm:p-12">
      <main className="max-w-6xl mx-auto">
        {/*
          Navbar (daisyui)
          Component references used in this file for maintainers:
          - Navbar: https://daisyui.com/components/navbar/
          - Button: https://daisyui.com/components/button/
          - Card: https://daisyui.com/components/card/
          - Dropdown: https://daisyui.com/components/dropdown/
          - Badge: https://daisyui.com/components/badge/
          - Input: https://daisyui.com/components/input/
          - Textarea: https://daisyui.com/components/textarea/
        */}

        {/* Navbar */}
        {/* <NavBar /> */}

        <h2 className="text-3xl font-bold mb-2 text-white">Dashboard</h2>
        <p className="text-white/90 mb-6">
          Here's a quick overview of your activities.
        </p>

        <section className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-white/95">
            Quick Actions
          </h3>
          <div className="flex gap-4">
            <a
              href="/invoices/new"
              className=" btn btn-soft btn-primary rounded"
            >
              Create New Invoice
            </a>
            <a
              href="/quotations/new"
              className="btn btn-accent rounded text-white"
            >
              Create New Quotation
            </a>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-3 text-white/95">
            Recent Activities
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activities.length === 0 ? (
              <div className="card bg-white/10 shadow-lg text-white/90 p-6">
                No recent activities
              </div>
            ) : (
              activities.map((act) => (
                <div
                  className="card bg-white/10 shadow-lg p-4 text-white/95"
                  key={`${act.type}-${act.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm opacity-90">
                        {new Date(act.date).toISOString().slice(0, 10)}
                      </div>
                      <div className="font-bold text-lg mt-1">
                        {act.clientName ?? act.clientCompany ?? "—"}
                      </div>
                      {act.clientCompany && act.clientName && (
                        <div className="text-xs opacity-80">
                          {act.clientCompany}
                        </div>
                      )}
                      {act.clientAddress1 && (
                        <div className="text-xs opacity-80">
                          {act.clientAddress1}
                        </div>
                      )}
                      {act.clientAddress2 && (
                        <div className="text-xs opacity-80">
                          {act.clientAddress2}
                        </div>
                      )}
                      {act.clientPhone && (
                        <div className="text-xs opacity-80">
                          Phone: {act.clientPhone}
                        </div>
                      )}
                      {act.clientEmail && (
                        <div className="text-xs opacity-80">
                          Email: {act.clientEmail}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="badge badge-lg badge-secondary text-white">
                        {act.type}
                      </div>
                      <div className="text-xl font-semibold mt-2">
                        {formatMoney(act.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
