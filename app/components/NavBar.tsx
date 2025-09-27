import React from "react";
import GmailAccountsDropdown from "./GmailAccountsDropdown";

const NavBar = () => {
  const nb = () => {
    return (
      <div className="navbar rounded-lg">
        <div className="flex-1">
          <a className=" normal-case text-xl text-white">Contractor Tool</a>
        </div>
        <div className="flex-none gap-2">
          {/* Desktop / md+ links */}
          <div className="hidden md:flex items-center gap-2">
            <a href="/" className="btn btn-accent rounded text-white">
              Dashboard
            </a>
            <a
              href="/invoices/new"
              className="btn btn-secondary btn-outline rounded text-white"
            >
              New Invoice
            </a>
            <a
              href="/quotations/new"
              className="btn btn-secondary btn-outline rounded text-white"
            >
              New Quotation
            </a>
            {/* Gmail dropdown component (client) handles fetching/listing/deleting accounts */}
            <GmailAccountsDropdown />
          </div>

          {/* Mobile: hamburger dropdown */}
          <div className="md:hidden flex items-center">
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </label>
              <ul
                tabIndex={0}
                className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-56"
              >
                <li>
                  <a href="/">Dashboard</a>
                </li>
                <li>
                  <a href="/invoices/new">New Invoice</a>
                </li>
                <li>
                  <a href="/quotations/new">New Quotation</a>
                </li>
                <li>
                  {/* Render the GmailAccountsDropdown inside the mobile menu as a list item */}
                  <div className="px-2 py-1">
                    <GmailAccountsDropdown />
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* <div className="navbar bg-base-100 shadow-sm">
        <div className="flex-1">
          <a className="text-xl">daisyUI</a>
        </div>
        <div className="flex-none">
          <ul className="menu menu-horizontal px-1">
            <li>
              <a>Link</a>
            </li>
            <li>
              <details>
                <summary>Parent</summary>
                <ul className="bg-base-100 rounded-t-none p-2">
                  <li>
                    <a>Link 1</a>
                  </li>
                  <li>
                    <a>Link 2</a>
                  </li>
                </ul>
              </details>
            </li>
          </ul>
        </div>
      </div> */}
      {nb()}
    </>
  );
};

export default NavBar;
