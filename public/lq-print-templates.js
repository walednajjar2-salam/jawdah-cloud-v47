(function () {
  "use strict";

  const LOGO = "assets/brand-logo-gold.png?v=12";
  const COMPANY = {
    ar: "مشاريع جودة الانطلاقة للخدمات",
    en: "QUALITY OF LAUNCH PROJECTS LLC",
    ownerAr: "يعقوب فاضل سعيد الخصيبي",
    ownerEn: "Yaqoub Fadel Saeed Al-Khasibi",
    cr: "1466316",
    postal: "611",
    country: "سلطنة عُمان · Sultanate of Oman",
    email: "info@alamal.info",
    phone: "+968 71924089",
    phoneAlt: "96203068 / 92120205",
    activity: "إدارة العقارات والضيافة · Real Estate & Hospitality Management",
    vatNo: "OM-VAT-PENDING",
  };

  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  function money(v) {
    if (typeof window.money === "function") return window.money(v);
    return `OMR ${Number(v || 0).toFixed(3)}`;
  }

  function data(table) {
    const j = window.Jawdah;
    return Array.isArray(j?.data?.[table]) ? j.data[table] : [];
  }

  function byId(table, id) {
    return data(table).find((r) => r.id === id) || {};
  }

  function accountantName() {
    const u = window.Jawdah?.user;
    if (!u) return "المحاسب المسؤول";
    if (u.role === "accountant" || u.role === "admin" || u.role === "owner") {
      return u.name || u.username || "المحاسب المسؤول";
    }
    const acc = data("users").find((x) => x.role === "accountant");
    return acc?.name || acc?.username || "المحاسب المسؤول";
  }

  function companyHeaderBlock(docTypeEn, docTypeAr, metaHtml = "") {
    return `<div class="lq-doc-head">
      <div class="lq-doc-brand">
        <img src="${LOGO}" alt="${esc(COMPANY.en)}">
        <div>
          <h1>${esc(COMPANY.ar)}</h1>
          <h2>${esc(COMPANY.en)}</h2>
          <p>
            ${esc(COMPANY.ownerAr)} · ${esc(COMPANY.ownerEn)}<br>
            ${esc(COMPANY.activity)}<br>
            س.ت: ${esc(COMPANY.cr)} · VAT: ${esc(COMPANY.vatNo)} · الرمز البريدي: ${esc(COMPANY.postal)} · ${esc(COMPANY.country)}<br>
            ${esc(COMPANY.email)} · ${esc(COMPANY.phone)} · GSM: ${esc(COMPANY.phoneAlt)}
          </p>
        </div>
      </div>
      <div class="lq-doc-meta">
        <span class="lq-doc-type">${esc(docTypeEn)}</span>
        <small style="display:block;color:#8f631b;font-weight:800;margin-bottom:8px">${esc(docTypeAr)}</small>
        ${metaHtml}
      </div>
    </div>`;
  }

  function depositStatus(contract) {
    const required = Number(contract.deposit_amount || 0);
    if (Number(contract.deposit_received) === 1) {
      const paid = Number(contract.deposit_received_amount || contract.deposit_amount || 0);
      return {
        required,
        paid,
        received: true,
        labelAr: "تم استلام التأمين المالي (مسجّل رسمياً)",
        labelEn: "Financial deposit received (official)",
        ok: true,
      };
    }
    if (required <= 0) {
      return { required: 0, paid: 0, received: true, labelAr: "لا يوجد تأمين", labelEn: "No deposit", ok: true };
    }
    const invoices = data("invoices").filter((i) => i.contract_id === contract.id);
    const depositInvoices = invoices.filter((i) =>
      /تأمين|deposit|security|امان/i.test(String(i.description || "")) ||
      String(i.invoice_type || "").toLowerCase() === "deposit"
    );
    const pool = depositInvoices.length ? depositInvoices : invoices;
    const paid = pool.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
    const received = paid >= required;
    return {
      required,
      paid,
      received,
      labelAr: received ? "تم استلام التأمين المالي" : "لم يُستلم التأمين المالي بالكامل",
      labelEn: received ? "Financial deposit received" : "Financial deposit not fully received",
      ok: received,
    };
  }

  function clientBlock(client, contract) {
    const c = client || {};
    const ct = contract || {};
    return `<div class="lq-doc-box">
      <h3>بيانات العميل · Client</h3>
      <p>
        <strong>${esc(c.name)}</strong><br>
        هاتف: ${esc(c.phone || "—")}<br>
        بريد: ${esc(c.email || "—")}<br>
        هوية / سجل: ${esc(ct.tenant_id_no || c.national_id || "—")}<br>
        جنسية: ${esc(ct.tenant_nationality || "—")}
      </p>
    </div>`;
  }

  function contractBlock(contract, property) {
    const c = contract || {};
    const p = property || {};
    const dep = depositStatus(c);
    const unit =
      c.unit_details ||
      (typeof window.propertyUnitLine === "function" ? window.propertyUnitLine(p) : "") ||
      p.unit_no ||
      "";
    const propLabel =
      typeof window.propertyLabel === "function" ? window.propertyLabel(p) : p.name || p.id || "";
    return `<div class="lq-doc-box">
      <h3>العقد والعقار · Contract & Property</h3>
      <p>
        رقم العقد: <strong>${esc(c.contract_no || c.id)}</strong><br>
        نوع العقد: ${esc(c.contract_type || "—")}<br>
        العقار: ${esc(propLabel)}<br>
        الوحدة: ${esc(unit || "—")}<br>
        الموقع: ${esc(p.location || "—")}<br>
        بداية العقد: <strong>${esc(c.start_date || "—")}</strong><br>
        نهاية العقد: <strong>${esc(c.end_date || "—")}</strong><br>
        الإيجار الشهري: ${money(c.rent_amount)}<br>
        التأمين المطلوب: ${money(dep.required)}<br>
        المستلم من التأمين: ${money(dep.paid)}<br>
        <span class="lq-doc-badge ${dep.ok ? "ok" : "no"}">${esc(dep.labelAr)}</span>
      </p>
    </div>`;
  }

  function totalsBlock(rows) {
    const body = rows
      .map((r, i) => {
        const grand = i === rows.length - 1;
        return `<tr${grand ? " class=\"lq-grand\"" : ""}><td>${esc(r.label)}</td><td>${esc(r.value)}</td></tr>`;
      })
      .join("");
    return `<div class="lq-doc-totals"><table>${body}</table></div>`;
  }

  function footerBlock() {
    return `<div class="lq-doc-footer">${esc(COMPANY.ar)} · ${esc(COMPANY.en)} · C.R. ${esc(COMPANY.cr)} · ${esc(COMPANY.email)} · ${esc(COMPANY.phone)}</div>`;
  }

  function wrapDoc(inner) {
    return `<div class="lq-doc invoice-paper lq-print-paper"><div class="lq-doc-watermark"><img src="${LOGO}" alt="${esc(COMPANY.en)}"></div>${inner}</div>`;
  }

  function invoiceTax(invoice) {
    const rate = Number(invoice.vat_rate ?? 0.05);
    let subtotal = Number(invoice.subtotal || 0);
    let vat = Number(invoice.vat_amount || 0);
    let grand = Number(invoice.grand_total || invoice.amount || 0);
    if (subtotal <= 0 && grand > 0) {
      subtotal = rate > 0 ? Math.round((grand / (1 + rate)) * 1000) / 1000 : grand;
      vat = Math.round((grand - subtotal) * 1000) / 1000;
    } else if (vat <= 0 && subtotal > 0) {
      vat = Math.round(subtotal * rate * 1000) / 1000;
      grand = Math.round((subtotal + vat) * 1000) / 1000;
    }
    return { subtotal, vat, grand, rate };
  }

  function buildTaxInvoiceHtml(invoice) {
    const contract = byId("contracts", invoice.contract_id);
    const client = byId("clients", invoice.client_id);
    const property = byId("properties", invoice.property_id || contract.property_id);
    const tax = invoiceTax(invoice);
    const paid = Number(invoice.paid_amount || 0);
    const remaining = Math.max(0, tax.grand - paid);
    const statusRaw = String(invoice.status || "").toLowerCase();
    const statusAr =
      statusRaw === "void"
        ? "ملغاة"
        : statusRaw === "paid" || remaining <= 0
          ? "مدفوعة"
          : statusRaw === "overdue"
            ? "متأخرة"
            : "قيد السداد";
    const acc = accountantName();
    const metaExtra = `<table>
      <tr><td>Invoice No.</td><td>${esc(invoice.invoice_no)}</td></tr>
      <tr><td>Seq.</td><td>${esc(invoice.sequence_year || "")}-${esc(invoice.sequence_no || "")}</td></tr>
      <tr><td>Issue Date</td><td>${esc(invoice.issue_date)}</td></tr>
      <tr><td>Due Date</td><td>${esc(invoice.due_date)}</td></tr>
      <tr><td>Status</td><td>${esc(statusAr)}</td></tr>
      <tr><td>VAT No.</td><td>${esc(COMPANY.vatNo)}</td></tr>
      <tr><td>Accountant</td><td>${esc(acc)}</td></tr>
    </table>`;

    const head = companyHeaderBlock("TAX INVOICE", "فاتورة ضريبية", metaExtra);

    const totals = totalsBlock([
      { label: "المجموع قبل الضريبة · Subtotal", value: money(tax.subtotal) },
      { label: `ضريبة القيمة المضافة ${Math.round(tax.rate * 100)}% · VAT`, value: money(tax.vat) },
      { label: "المدفوع · Paid", value: money(paid) },
      { label: "المتبقي · Balance Due", value: money(remaining) },
      { label: "الإجمالي الكلي · Grand Total", value: money(tax.grand) },
    ]);

    return wrapDoc(
      head +
        `<div class="lq-doc-grid">${clientBlock(client, contract)}${contractBlock(contract, property)}</div>
        <table class="lq-doc-table">
          <thead><tr><th>البيان · Description</th><th>المبلغ · Amount</th></tr></thead>
          <tbody><tr><td>${esc(invoice.description || "خدمات إيجار / Rental services")}</td><td class="num">${money(tax.subtotal)}</td></tr></tbody>
        </table>
        <div class="lq-doc-summary">
          <div class="lq-doc-notes">
            <strong>ملاحظات:</strong> هذه فاتورة ضريبية صادرة من نظام ${esc(COMPANY.ar)}.<br>
            المحاسب المسؤول: <strong>${esc(acc)}</strong><br>
            تاريخ الطباعة: ${esc(new Date().toISOString().slice(0, 10))}
          </div>
          ${totals}
        </div>
        <div class="lq-doc-sign">
          <div><strong>المحاسب المسؤول</strong>${esc(acc)}</div>
          <div><strong>توقيع العميل</strong></div>
          <div><strong>ختم الشركة</strong></div>
        </div>
        ${footerBlock()}`
    );
  }

  function buildReceiptHtml(invoice, payment) {
    const client = byId("clients", invoice.client_id);
    const contract = byId("contracts", invoice.contract_id);
    const acc = accountantName();
    const head = companyHeaderBlock("RECEIPT VOUCHER", "إيصال قبض", `<table>
        <tr><td>Receipt</td><td>${esc(payment.id)}</td></tr>
        <tr><td>Date</td><td>${esc(payment.payment_date)}</td></tr>
        <tr><td>Method</td><td>${esc(payment.method)}</td></tr>
        <tr><td>Invoice</td><td>${esc(invoice.invoice_no)}</td></tr>
      </table>`);
    return wrapDoc(
      head +
        `<div class="lq-doc-grid">${clientBlock(client, contract)}<div class="lq-doc-box"><h3>Against Invoice</h3><p>${esc(invoice.invoice_no)}<br>${esc(invoice.description)}</p></div></div>
        <div class="lq-doc-totals"><table><tr><td>المبلغ المستلم · Amount Received</td><td>${money(payment.amount)}</td></tr></table></div>
        <p class="lq-doc-notes">${esc(payment.note || "دفعة على الفاتورة")}</p>
        <div class="lq-doc-sign"><div><strong>استلم بواسطة</strong>${esc(acc)}</div><div><strong>توقيع العميل</strong></div><div><strong>ختم الشركة</strong></div></div>
        ${footerBlock()}`
    );
  }
  function parseTerms(termsRaw) {
    const raw = String(termsRaw || "").trim();
    if (!raw) return [];
    return raw
      .split(/\n+/)
      .map((x) => x.replace(/^\s*[-•\d\.\)\(]+\s*/, "").trim())
      .filter(Boolean);
  }
  function parseAttachments(contract) {
    const raw = contract?.attachments;
    if (!raw) return [];
    try {
      const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!Array.isArray(arr)) return [];
      return arr.filter((x) => x && typeof x === "object");
    } catch (_e) {
      return [];
    }
  }
  function buildLeaseContractHtml(contract) {
    const c = contract || {};
    const client = byId("clients", c.client_id);
    const property = byId("properties", c.property_id);
    const dep = depositStatus(c);
    const terms = parseTerms(c.legal_terms || "");
    const attachments = parseAttachments(c);
    const start = String(c.start_date || "");
    const end = String(c.end_date || "");
    const startDt = start ? new Date(`${start}T00:00:00`) : null;
    const endDt = end ? new Date(`${end}T00:00:00`) : null;
    const days = startDt && endDt ? Math.max(0, Math.floor((endDt - startDt) / 86400000) + 1) : 0;
    const months = days ? Math.max(1, Math.round(days / 30)) : 0;
    const unit = c.unit_details || (typeof window.propertyUnitLine === "function" ? window.propertyUnitLine(property) : "");
    const meta = `<table>
      <tr><td>Contract No.</td><td>${esc(c.contract_no || c.id || "—")}</td></tr>
      <tr><td>Type</td><td>${esc(c.contract_type || "Lease")}</td></tr>
      <tr><td>Start</td><td>${esc(start || "—")}</td></tr>
      <tr><td>End</td><td>${esc(end || "—")}</td></tr>
      <tr><td>Status</td><td>${esc(c.status || "Draft")}</td></tr>
      <tr><td>Signatory</td><td>${esc(c.company_signatory || COMPANY.en)}</td></tr>
    </table>`;
    const head = companyHeaderBlock("LEASE CONTRACT", "عقد إيجار", meta);
    const termsHtml = terms.length
      ? `<ol>${terms.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>`
      : `<p class="terms">${esc(c.legal_terms || "لا توجد شروط إضافية.")}</p>`;
    const attachHtml = attachments.length
      ? `<ul>${attachments.map((a) => `<li>${esc(a.name || "Attachment")} · ${esc(a.type || "file")} · ${esc(a.uploaded_at || "")}</li>`).join("")}</ul>`
      : "<p>لا توجد مرفقات.</p>";
    return wrapDoc(
      head +
        `<div class="lq-doc-grid">
          ${clientBlock(client, c)}
          ${contractBlock(c, property)}
        </div>
        <table class="lq-doc-table">
          <thead><tr><th>تفاصيل العقد</th><th>القيمة</th></tr></thead>
          <tbody>
            <tr><td>الوحدة المؤجرة</td><td class="num">${esc(unit || "—")}</td></tr>
            <tr><td>المدة</td><td class="num">${esc(months)} شهر · ${esc(days)} يوم</td></tr>
            <tr><td>الإيجار</td><td class="num">${money(c.rent_amount)}</td></tr>
            <tr><td>دورية الدفع</td><td class="num">${esc(c.payment_cycle || "monthly")}</td></tr>
            <tr><td>غرامة التأخير</td><td class="num">${money(c.late_fee || 0)}</td></tr>
            <tr><td>مهلة السداد</td><td class="num">${esc(c.grace_days || 0)} يوم</td></tr>
            <tr><td>التأمين المطلوب / المستلم</td><td class="num">${money(dep.required)} / ${money(dep.paid)}</td></tr>
          </tbody>
        </table>
        <div class="lq-doc-summary">
          <div class="lq-doc-notes">
            <strong>الشروط القانونية · Legal Terms</strong>
            ${termsHtml}
            <div style="margin-top:10px"><strong>ملاحظات:</strong> ${esc(c.notes || "—")}</div>
          </div>
          <div class="lq-doc-box">
            <h3>المرفقات · Attachments</h3>
            ${attachHtml}
          </div>
        </div>
        <div class="lq-doc-sign">
          <div><strong>توقيع المستأجر</strong></div>
          <div><strong>توقيع الشركة</strong>${esc(c.company_signatory || COMPANY.en)}</div>
          <div><strong>الختم الرسمي</strong></div>
        </div>
        ${footerBlock()}`
    );
  }

  function assetBase() {
    const p = window.location.pathname || "/";
    const base = p.endsWith("/") ? p : p.replace(/\/[^/]*$/, "/");
    return window.location.origin + base;
  }

  function printInvoiceDocument() {
    const preview = document.querySelector("#invoicePreview");
    if (!preview || !preview.innerHTML.trim()) return;
    const base = assetBase();
    const html = preview.innerHTML;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      document.body.classList.add("lq-printing-invoice");
      window.print();
      setTimeout(() => document.body.classList.remove("lq-printing-invoice"), 500);
      return;
    }
    w.document.write(
      `<!doctype html><html lang="ar" dir="ltr"><head><meta charset="utf-8"><title>Print</title>
      <link rel="stylesheet" href="${base}lq-print.css?v=lq2">
      </head><body class="lq-print-body">${html}</body></html>`
    );
    w.document.close();
    w.onload = () => {
      w.focus();
      w.print();
    };
  }

  function downloadInvoicePdf() {
    printInvoiceDocument();
  }

  window.LQ_PRINT = {
    COMPANY,
    LOGO,
    buildTaxInvoiceHtml,
    buildReceiptHtml,
    buildLeaseContractHtml,
    printInvoiceDocument,
    downloadInvoicePdf,
    depositStatus,
    accountantName,
    invoiceTax,
  };
  window.printInvoiceDocument = printInvoiceDocument;
  window.downloadInvoicePdf = downloadInvoicePdf;
})();
