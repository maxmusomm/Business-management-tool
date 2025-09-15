import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 sm:p-12">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            IP
          </div>
          <div>
            <h1 className="text-xl font-semibold">InvoicePro</h1>
            <div className="text-sm text-slate-500">
              Simple invoices & quotations
            </div>
          </div>
        </div>
        <nav className="flex gap-4 text-sm text-slate-600">
          <a className="px-3 py-2 rounded-md bg-white shadow-sm" href="/">
            Dashboard
          </a>
          <a
            className="px-3 py-2 rounded-md hover:bg-white/60"
            href="/invoices/new"
          >
            Invoices
          </a>
          <a
            className="px-3 py-2 rounded-md hover:bg-white/60"
            href="/quotations/new"
          >
            Quotations
          </a>
          <a
            className="px-3 py-2 rounded-md hover:bg-white/60"
            href="/products"
          >
            Products
          </a>
          <a
            className="px-3 py-2 rounded-md hover:bg-white/60"
            href="/settings"
          >
            Settings
          </a>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
        <p className="text-slate-600 mb-6">
          Here's a quick overview of your activities.
        </p>

        <section className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
          <div className="flex gap-4">
            <a
              href="/invoices/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md shadow"
            >
              Create New Invoice
            </a>
            <a
              href="/quotations/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-800 rounded-md"
            >
              Create New Quotation
            </a>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-3">Recent Activities</h3>
          <div className="bg-white shadow rounded-md overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-sm text-slate-500">Date</th>
                  <th className="px-6 py-3 text-sm text-slate-500">Type</th>
                  <th className="px-6 py-3 text-sm text-slate-500">Amount</th>
                  <th className="px-6 py-3 text-sm text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-6 py-4">2024-07-26</td>
                  <td className="px-6 py-4">Invoice</td>
                  <td className="px-6 py-4">$1,500.00</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm">
                      Paid
                    </span>
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-6 py-4">2024-07-25</td>
                  <td className="px-6 py-4">Quotation</td>
                  <td className="px-6 py-4">$2,000.00</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-sm">
                      Sent
                    </span>
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-6 py-4">2024-07-24</td>
                  <td className="px-6 py-4">Invoice</td>
                  <td className="px-6 py-4">$800.00</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm">
                      Pending
                    </span>
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-6 py-4">2024-07-23</td>
                  <td className="px-6 py-4">Invoice</td>
                  <td className="px-6 py-4">$2,200.00</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm">
                      Paid
                    </span>
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-6 py-4">2024-07-22</td>
                  <td className="px-6 py-4">Quotation</td>
                  <td className="px-6 py-4">$1,200.00</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm">
                      Accepted
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
