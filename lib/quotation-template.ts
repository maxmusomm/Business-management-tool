type QuotationItem = {
  title: string;
  description?: string;
  qty: number;
  unitPrice: number;
};

type ContactBlock = {
  name?: string;
  company?: string;
  addressLine1?: string;
  addressLine2?: string;
  phone?: string;
  email?: string;
};

type QuotationData = {
  quotationNumber?: string;
  quoteDate?: string;
  validUntil?: string;
  paymentTerms?: string;
  project?: string;
  billTo?: ContactBlock;
  from?: ContactBlock;
  items?: QuotationItem[];
  taxRate?: number; // decimal (e.g. 0.085)
  terms?: string[];
  logoUrl?: string;
  companyContactEmail?: string;
  companyContactPhone?: string;
};

const defaultItems: QuotationItem[] = [
  {
    title: "Website Design & Development",
    description:
      "Custom responsive design with modern UI/UX principles, including mobile optimization and cross-browser compatibility.",
    qty: 1,
    unitPrice: 2500,
  },
  {
    title: "Content Management System",
    description:
      "Integration of user-friendly CMS for easy content updates and management.",
    qty: 1,
    unitPrice: 800,
  },
  {
    title: "SEO Optimization",
    description:
      "On-page SEO optimization, meta tags, and search engine friendly structure.",
    qty: 1,
    unitPrice: 400,
  },
  {
    title: "Training & Documentation",
    description:
      "User training session and comprehensive documentation for website management.",
    qty: 2,
    unitPrice: 150,
  },
];

type TemplateOptions = {
  titleText?: string; // e.g. 'QUOTATION' or 'INVOICE'
};

const quotationHtmlTemplate = (
  data?: QuotationData,
  opts?: TemplateOptions
) => {
  const d: QuotationData = {
    quotationNumber: "#QT-2024-001",
    quoteDate: "December 15, 2024",
    validUntil: "January 15, 2025",
    paymentTerms: "Net 30 Days",
    project: "Website Development & Design",
    billTo: {
      name: "John Smith",
      company: "ABC Corporation",
      addressLine1: "123 Business Street",
      addressLine2: "City, State 12345",
      phone: "(555) 123-4567",
      email: "john@abccorp.com",
    },
    from: {
      name: "Your Company Name",
      addressLine1: "456 Service Avenue",
      addressLine2: "Business City, State 67890",
      phone: "(555) 987-6543",
      email: "info@yourcompany.com",
    },
    items: defaultItems,
    taxRate: 0.085,
    terms: [
      "Payment is due within 30 days of invoice date",
      "50% deposit required before project commencement",
      "Additional revisions beyond scope will be charged at $75/hour",
      "Project timeline: 4-6 weeks from deposit receipt",
      "All work includes 30-day warranty for bug fixes",
    ],
    logoUrl: "http://127.0.0.1:5500/tests/img/vendeta_logo.png",
    companyContactEmail: "info@yourcompany.com",
    companyContactPhone: "(555) 987-6543",
    ...data,
  };

  const fmtCurrency = (v: number) => {
    return `$${v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  const items = d.items && d.items.length ? d.items : [];
  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const tax = +(subtotal * (d.taxRate ?? 0)).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  const itemsHtml = items
    .map((it) => {
      return `
                                        <tr>
                                                <td class="description">
                                                        <strong>${
                                                          it.title
                                                        }</strong>
                                                        <small>${
                                                          it.description ?? ""
                                                        }</small>
                                                </td>
                                                <td class="quantity">${
                                                  it.qty
                                                }</td>
                                                <td class="price">${fmtCurrency(
                                                  it.unitPrice
                                                )}</td>
                                                <td class="total">${fmtCurrency(
                                                  it.qty * it.unitPrice
                                                )}</td>
                                        </tr>`;
    })
    .join("\n");

  const termsHtml = (d.terms || []).map((t) => `<li>${t}</li>`).join("\n");

  const billTo = d.billTo ?? {};
  const from = d.from ?? {};

  const titleText = opts?.titleText ?? "QUOTATION";

  const quotationTemplate: string = `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quotation Template</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
        }

        .quotation-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            background: white;
        }

        /* Header Section */
        .header {
            background: #2c5aa0;
            color: white;
            padding: 30px;
            position: relative;
            overflow: hidden;
        }
        .logo-img{
            width: 385px;
        }


        .quotation-title {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 2px;
            margin-bottom: 8px;
        }



        .quotation-number {
            position: absolute;
            top: 30px;
            right: 30px;
            background: rgba(255, 255, 255, 0.15);
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
        }

        /* Main Content */
        .main-content {
            padding: 30px;
        }

        /* Info Section - Using table for better PDF support */
        .info-section {
            width: 100%;
            margin-bottom: 30px;
        }

        .info-section table {
            width: 100%;
            border-collapse: collapse;
        }

        .info-section td {
            width: 50%;
            vertical-align: top;
            padding: 0 10px 0 0;
        }

        .info-block h3 {
            color: #2c5aa0;
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .info-block p {
            margin: 2px 0;
            font-size: 12px;
            line-height: 1.3;
        }

        /* Quotation Details */
        .quotation-details {
            margin-bottom: 30px;
        }

        .quotation-details table {
            width: 100%;
            border-collapse: collapse;
        }

        .quotation-details td {
            padding: 4px 15px 4px 0;
            font-size: 12px;
        }

        .quotation-details .label {
            font-weight: bold;
            color: #555;
            width: 120px;
        }



        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
        }

        .items-table th {
            background: #2c5aa0;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 10px;
        }

        .items-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #eee;
            vertical-align: top;
        }

        .items-table tr:nth-child(even) {
            background: #f8f9fa;
        }

        .items-table .description {
            width: 50%;
        }

        .items-table .quantity {
            width: 10%;
            text-align: center;
        }

        .items-table .price {
            width: 20%;
            text-align: right;
        }

        .items-table .total {
            width: 20%;
            text-align: right;
            font-weight: bold;
        }

        .items-table .description strong {
            display: block;
            margin-bottom: 4px;
            color: #333;
        }

        .items-table .description small {
            color: #666;
            font-size: 10px;
            line-height: 1.2;
        }

        /* Totals Section */
        .totals-section {
            width: 300px;
            margin: 20px 0 0 auto;
        }

        .totals-section table {
            width: 100%;
            border-collapse: collapse;
        }

        .totals-row td {
            padding: 6px 0;
            border-bottom: 1px solid #eee;
            font-size: 12px;
        }

        .totals-row.tax td {
            color: #666;
            font-size: 11px;
        }

        .totals-row.final-total td {
            background: #2c5aa0;
            color: white;
            padding: 10px 15px;
            font-weight: bold;
            font-size: 14px;
            border-bottom: none;
        }

        .totals-amount {
            text-align: right;
            font-weight: bold;
        }

        /* Terms Section */
        .terms-section {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #eee;
        }

        .terms-section h3 {
            color: #2c5aa0;
            font-size: 13px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .terms-section ul {
            list-style: none;
            padding: 0;
        }

        .terms-section li {
            font-size: 11px;
            color: #666;
            margin-bottom: 4px;
            padding-left: 10px;
            position: relative;
        }

        .terms-section li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #2c5aa0;
        }

        /* Footer */
        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            border-top: 1px solid #eee;
            overflow: hidden;
        }

        .footer table {
            width: 100%;
        }

        .thank-you {
            font-size: 13px;
            color: #2c5aa0;
            font-weight: bold;
        }

        .contact-info {
            font-size: 11px;
            color: #666;
            text-align: right;
        }

        /* Print Styles */
        @media print {
            body {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
            }

            .quotation-container {
                box-shadow: none;
            }

            .header {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
            }

            .items-table th {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
            }

            .totals-row.final-total td {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
        }
    </style>
</head>

<body>
    <div class="quotation-container">
        <div class="header">
                <div class="logo-space">
                <img src="${d.logoUrl}" alt="Logo" class="logo-img">
            </div>
            <div class="quotation-title">${titleText}</div>
            <div class="quotation-number">${d.quotationNumber}</div>
        </div>

        <div class="main-content">
            <div class="info-section">
                <table>
                    <tr>
                        <td>
                            <div class="info-block">
                                <h3>Bill To</h3>
                                <p><strong>${billTo.name ?? ""}</strong></p>
                                <p>${billTo.company ?? ""}</p>
                                <p>${billTo.addressLine1 ?? ""}</p>
                                <p>${billTo.addressLine2 ?? ""}</p>
                                <p>Phone: ${billTo.phone ?? ""}</p>
                                <p>Email: ${billTo.email ?? ""}</p>
                            </div>
                        </td>
                        <td>
                            <div class="info-block">
                                <h3>From</h3>
                                <p><strong>${from.name ?? ""}</strong></p>
                                <p>${from.addressLine1 ?? ""}</p>
                                <p>${from.addressLine2 ?? ""}</p>
                                <p>Phone: ${from.phone ?? ""}</p>
                                <p>Email: ${from.email ?? ""}</p>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="quotation-details">
                <table>
                    <tr>
                        <td class="label">Quote Date:</td>
                        <td>${d.quoteDate}</td>
                    </tr>
                    <tr>
                        <td class="label">Valid Until:</td>
                        <td>${d.validUntil}</td>
                    </tr>
                    <tr>
                        <td class="label">Payment Terms:</td>
                        <td>${d.paymentTerms}</td>
                    </tr>
                    <tr>
                        <td class="label">Project:</td>
                        <td>${d.project}</td>
                    </tr>
                </table>
            </div>



            <table class="items-table">
                <thead>
                    <tr>
                        <th class="description">Description</th>
                        <th class="quantity">Qty</th>
                        <th class="price">Unit Price</th>
                        <th class="total">Total</th>
                    </tr>
                </thead>
                <tbody>
${itemsHtml}
                </tbody>
            </table>

            <div class="totals-section">
                <table>
                    <tr class="totals-row">
                            <td>Subtotal:</td>
                            <td class="totals-amount">${fmtCurrency(
                              subtotal
                            )}</td>
                        </tr>
                        <tr class="totals-row tax">
                            <td>Tax (${((d.taxRate ?? 0) * 100).toFixed(
                              2
                            )}%):</td>
                            <td class="totals-amount">${fmtCurrency(tax)}</td>
                        </tr>
                        <tr class="totals-row final-total">
                            <td>TOTAL:</td>
                            <td class="totals-amount">${fmtCurrency(total)}</td>
                        </tr>
                </table>
            </div>

            <div class="terms-section">
                <h3>Terms & Conditions</h3>
                <ul>
${termsHtml}
                </ul>
            </div>
        </div>

        <div class="footer">
            <table>
                <tr>
                    <td>
                        <div class="thank-you">Thank you for your business!</div>
                    </td>
                    <td>
                        <div class="contact-info">
                            Questions? Contact us at ${
                              d.companyContactEmail
                            }<br>
                            or call ${d.companyContactPhone}
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    </div>
</body>

</html>
`;
  return quotationTemplate;
};

export { quotationHtmlTemplate };
