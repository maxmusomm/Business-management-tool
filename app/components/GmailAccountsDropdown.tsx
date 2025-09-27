"use client";
import React, { useEffect, useState } from "react";
import accountIcon from "@/app/components/images/icons/accountIcon.png";
import Image from "next/image";

type Account = {
  email: string;
};

export default function GmailAccountsDropdown() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function fetchAccounts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gmail/list", { cache: "no-store" });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      const accs: string[] = data?.accounts ?? [];
      setAccounts(accs.map((a) => ({ email: a })));
    } catch (err: any) {
      console.error("fetchAccounts error", err);
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function handleDelete(email: string) {
    if (!confirm(`Delete gmail account ${email}?`)) return;
    try {
      const res = await fetch("/api/gmail/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      // refresh list
      await fetchAccounts();
    } catch (err) {
      console.error("delete account error", err);
      alert("Failed to delete account");
    }
  }

  return (
    <div className="dropdown dropdown-end ">
      <label tabIndex={0} className="btn btn-ghost btn-circle avatar ">
        <div className="w-8 rounded-full ">
          <div className="dropdown dropdown-end ">
            {/* simple user / mail icon */}
            <img src={accountIcon.src} alt="account Icon" />
          </div>

          <ul
            tabIndex={0}
            className="dropdown-content menu bg-base-100 rounded-box z-50 w-72 p-2 shadow-sm mt-2"
          >
            <li>
              <a href="/api/gmail/auth">Authorize account</a>
            </li>
            <li>
              <div className="divider my-1" />
            </li>
            {loading ? (
              <li>
                <a>Loading...</a>
              </li>
            ) : accounts.length === 0 ? (
              <li>
                <a>No accounts</a>
              </li>
            ) : (
              accounts.map((acc, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <a className="truncate">{acc.email}</a>
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(acc.email);
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))
            )}
            {error && (
              <li>
                <a className="text-error">{error}</a>
              </li>
            )}
          </ul>
        </div>
      </label>
    </div>
  );
}
