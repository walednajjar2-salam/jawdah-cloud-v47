(function () {
  "use strict";

  const LOGO = "assets/brand-logo-gold.png?v=12";
  const COMPANY = {
    ar: "مشاريع جودة الانطلاقة للخدمات",
    en: "QUALITY OF LAUNCH PROJECTS LLC",
    ownerAr: "يعقوب فاضل الخصيبي",
    ownerEn: "Yaqoub Fadel Al-Khasibi",
    cr: "1466316",
    postal: "611",
    country: "نزوى — حي التراث · سلطنة عُمان",
    email: "jiwdat@gmail.com",
    phone: "25225026",
    phoneAlt: "98203088 / 92120205 / 92269656",
    activity: "إدارة وتأجير العقارات ووساطة العقارات · خدمات الضيافة",
    vatNo: "OM-VAT-PENDING",
    address: "نزوى — حي التراث الشمالي قرب الدوار",
  };

  const CODEISH =
    /\b(function|const|let|var|undefined|null|NaN|true|false|window\.|document\.|Jawdah|console\.|typeof|=>|<\/?script|onclick=|onerror=)\b/i;

  function esc(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** يمنع ظهور نصوص برمجية أو قيم خام غير صالحة داخل المستند المطبوع */
  function cleanText(v, fallback) {
    const s = String(v ?? "").trim();
    if (!s) return fallback || "—";
    if (CODEISH.test(s)) return fallback || "—";
    if (/^\s*[{[]/.test(s) && /[}\]]\s*$/.test(s)) return fallback || "—";
    return s;
  }

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
      return cleanText(u.name || u.username, "المحاسب المسؤول");
    }
    const acc = data("users").find((x) => x.role === "accountant");
    return cleanText(acc?.name || acc?.username, "المحاسب المسؤول");
  }

  function isCommercialOrShortStay(contract, invoice) {
    const blob = [
      contract?.contract_type,
      contract?.notes,
      contract?.unit_details,
      invoice?.invoice_type,
      invoice?.description,
    ]
      .map((x) => String(x || "").toLowerCase())
      .join(" ");
    // Tight markers only — ordinary residential / staff housing stay exempt.
    return /commercial|تجاري|office|مكتبي|short[\s_-]?stay|إقامة قصيرة|قصير الأمد|hotel|hospit|ضيافة|غرفة فندق/.test(
      blob
    );
  }

  /** معاملة ضريبية صحيحة: السكن العادي معفى */
  function resolveTaxTreatment(contract, invoice) {
    if (isCommercialOrShortStay(contract, invoice)) {
      const rate = Number(invoice?.vat_rate) > 0 ? Number(invoice.vat_rate) : 0.05;
      return {
        rate,
        code: "standard",
        labelAr: `خاضع لضريبة القيمة المضافة بنسبة ${Math.round(rate * 100)}%`,
        labelEn: `VAT standard-rated ${Math.round(rate * 100)}%`,
        docTitleEn: "TAX INVOICE",
        docTitleAr: "فاتورة ضريبية",
      };
    }
    return {
      rate: 0,
      code: "exempt",
      labelAr: "معفى من ضريبة القيمة المضافة (إيجار سكني)",
      labelEn: "VAT exempt — residential rent",
      docTitleEn: "RENTAL INVOICE",
      docTitleAr: "فاتورة إيجار",
    };
  }

  function companyHeaderBlock(docTypeEn, docTypeAr, metaHtml) {
    return `<div class="lq-doc-head">
      <div class="lq-doc-brand">
        <img src="${LOGO}" alt="${esc(COMPANY.en)}">
        <div>
          <h1>${esc(COMPANY.ar)}</h1>
          <h2>${esc(COMPANY.en)}</h2>
          <p>
            ${esc(COMPANY.ownerAr)} · ${esc(COMPANY.ownerEn)}<br>
            ${esc(COMPANY.activity)}<br>
            س.ت: ${esc(COMPANY.cr)} · الرقم الضريبي: ${esc(COMPANY.vatNo)} · الرمز البريدي: ${esc(COMPANY.postal)} · ${esc(COMPANY.country)}<br>
            ${esc(COMPANY.email)} · ${esc(COMPANY.phone)} · GSM: ${esc(COMPANY.phoneAlt)}
          </p>
        </div>
      </div>
      <div class="lq-doc-meta">
        <span class="lq-doc-type">${esc(docTypeEn)}</span>
        <small class="lq-doc-type-ar">${esc(docTypeAr)}</small>
        ${metaHtml || ""}
      </div>
    </div>
    <div class="lq-doc-banner" aria-hidden="true"></div>`;
  }

  function contactFooterBar() {
    return `<div class="lq-doc-contactbar">
      <span>☎ ${esc(COMPANY.phone)}</span>
      <span>WhatsApp ${esc(COMPANY.phoneAlt.split("/")[0].trim())}</span>
      <span>✉ ${esc(COMPANY.email)}</span>
      <span>${esc(COMPANY.address)}</span>
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
        labelAr: "تم استلام التأمين المالي (مسجّل رسميًا)",
        ok: true,
      };
    }
    if (required <= 0) {
      return { required: 0, paid: 0, received: true, labelAr: "لا يوجد تأمين", ok: true };
    }
    const invoices = data("invoices").filter((i) => i.contract_id === contract.id);
    const depositInvoices = invoices.filter(
      (i) =>
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
      ok: received,
    };
  }

  function clientBlock(client, contract) {
    const c = client || {};
    const ct = contract || {};
    return `<div class="lq-doc-box">
      <h3>بيانات المستأجر · Tenant</h3>
      <p>
        <strong>${esc(cleanText(c.name, "—"))}</strong><br>
        هاتف: ${esc(cleanText(c.phone, "—"))}<br>
        بريد: ${esc(cleanText(c.email, "—"))}<br>
        هوية / جواز: ${esc(cleanText(ct.tenant_id_no || c.national_id, "—"))}<br>
        جنسية: ${esc(cleanText(ct.tenant_nationality, "—"))}
      </p>
    </div>`;
  }

  function contractBlock(contract, property) {
    const c = contract || {};
    const p = property || {};
    const dep = depositStatus(c);
    const unit =
      cleanText(c.unit_details, "") ||
      (typeof window.propertyUnitLine === "function" ? window.propertyUnitLine(p) : "") ||
      cleanText(p.apartment_no || p.unit_no, "—");
    const propLabel =
      typeof window.propertyLabel === "function" ? window.propertyLabel(p) : cleanText(p.name, "—");
    const tax = resolveTaxTreatment(c);
    return `<div class="lq-doc-box">
      <h3>العقد والعقار · Contract & Property</h3>
      <p>
        رقم العقد: <strong>${esc(cleanText(c.contract_no || c.id, "—"))}</strong><br>
        نوع العقد: ${esc(cleanText(c.contract_type, "سكني"))}<br>
        العقار / الوحدة: ${esc(cleanText(propLabel, "—"))}<br>
        تفاصيل الوحدة: ${esc(cleanText(unit, "—"))}<br>
        الموقع: ${esc(cleanText(p.location, "—"))}<br>
        بداية العقد: <strong>${esc(cleanText(c.start_date, "—"))}</strong><br>
        نهاية العقد: <strong>${esc(cleanText(c.end_date, "—"))}</strong><br>
        الإيجار الشهري: ${money(c.rent_amount)}<br>
        التأمين المطلوب: ${money(dep.required)} · المستلم: ${money(dep.paid)}<br>
        المعاملة الضريبية: <strong>${esc(tax.labelAr)}</strong><br>
        <span class="lq-doc-badge ${dep.ok ? "ok" : "no"}">${esc(dep.labelAr)}</span>
      </p>
    </div>`;
  }

  function totalsBlock(rows) {
    const body = rows
      .map((r, i) => {
        const grand = i === rows.length - 1;
        return `<tr${grand ? ' class="lq-grand"' : ""}><td>${esc(r.label)}</td><td>${esc(r.value)}</td></tr>`;
      })
      .join("");
    return `<div class="lq-doc-totals"><table>${body}</table></div>`;
  }

  function footerBlock() {
    return `<div class="lq-doc-footer">${esc(COMPANY.ar)} · ${esc(COMPANY.en)} · س.ت ${esc(COMPANY.cr)} · ${esc(COMPANY.email)} · ${esc(COMPANY.phone)}</div>
      ${contactFooterBar()}`;
  }

  function wrapDoc(inner, extraClass) {
    return `<div class="lq-doc invoice-paper lq-print-paper ${extraClass || ""}">${inner}</div>`;
  }

  function invoiceTax(invoice, contract) {
    const treatment = resolveTaxTreatment(contract, invoice);
    // Prefer legal treatment over legacy stored rates (e.g. 5% wrongly saved on residential).
    const rate = treatment.code === "exempt" ? 0 : Number(invoice.vat_rate != null ? invoice.vat_rate : treatment.rate) || treatment.rate;
    let subtotal = Number(invoice.subtotal || 0);
    let vat = Number(invoice.vat_amount || 0);
    let grand = Number(invoice.grand_total || invoice.amount || 0);
    if (rate <= 0) {
      if (subtotal <= 0 && grand > 0) {
        // If a legacy invoice baked VAT into amount, recover the rent base when possible.
        const storedRate = Number(invoice.vat_rate || 0);
        subtotal = storedRate > 0 ? Math.round((grand / (1 + storedRate)) * 1000) / 1000 : grand;
      }
      vat = 0;
      grand = subtotal || grand;
      return { subtotal, vat, grand, rate: 0, treatment };
    }
    if (subtotal <= 0 && grand > 0) {
      subtotal = Math.round((grand / (1 + rate)) * 1000) / 1000;
      vat = Math.round((grand - subtotal) * 1000) / 1000;
    } else if (vat <= 0 && subtotal > 0) {
      vat = Math.round(subtotal * rate * 1000) / 1000;
      grand = Math.round((subtotal + vat) * 1000) / 1000;
    }
    return { subtotal, vat, grand, rate, treatment };
  }

  function buildTaxInvoiceHtml(invoice) {
    const contract = byId("contracts", invoice.contract_id);
    const client = byId("clients", invoice.client_id);
    const property = byId("properties", invoice.property_id || contract.property_id);
    const tax = invoiceTax(invoice, contract);
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
    const treatment = tax.treatment;
    const metaExtra = `<table>
      <tr><td>رقم الفاتورة</td><td>${esc(cleanText(invoice.invoice_no, "—"))}</td></tr>
      <tr><td>التسلسل</td><td>${esc(cleanText((invoice.sequence_year || "") + "-" + (invoice.sequence_no || ""), "—"))}</td></tr>
      <tr><td>تاريخ الإصدار</td><td>${esc(cleanText(invoice.issue_date, "—"))}</td></tr>
      <tr><td>تاريخ الاستحقاق</td><td>${esc(cleanText(invoice.due_date, "—"))}</td></tr>
      <tr><td>الحالة</td><td>${esc(statusAr)}</td></tr>
      <tr><td>المعاملة الضريبية</td><td>${esc(treatment.labelAr)}</td></tr>
      <tr><td>المحاسب</td><td>${esc(acc)}</td></tr>
    </table>`;

    const head = companyHeaderBlock(treatment.docTitleEn, treatment.docTitleAr, metaExtra);
    const vatRowLabel =
      tax.rate > 0
        ? `ضريبة القيمة المضافة ${Math.round(tax.rate * 100)}% · VAT`
        : "ضريبة القيمة المضافة · VAT (معفى)";

    const totals = totalsBlock([
      { label: "المجموع قبل الضريبة · Subtotal", value: money(tax.subtotal) },
      { label: vatRowLabel, value: money(tax.vat) },
      { label: "المدفوع · Paid", value: money(paid) },
      { label: "المتبقي · Balance Due", value: money(remaining) },
      { label: "الإجمالي الكلي · Grand Total", value: money(tax.grand) },
    ]);

    const note =
      tax.rate > 0
        ? `فاتورة ضريبية صادرة من ${COMPANY.ar}. المعاملة: ${treatment.labelAr}.`
        : `فاتورة إيجار سكني معفاة من ضريبة القيمة المضافة وفق المعاملة: ${treatment.labelAr}. لا تُعامل كفاتورة ضريبية خاضعة.`;

    return wrapDoc(
      head +
        `<div class="lq-doc-grid">${clientBlock(client, contract)}${contractBlock(contract, property)}</div>
        <table class="lq-doc-table">
          <thead><tr>
            <th>البيان</th><th>الكمية</th><th>سعر الوحدة</th><th>الضريبة</th><th>الإجمالي</th>
          </tr></thead>
          <tbody><tr>
            <td>${esc(cleanText(invoice.description, "خدمات إيجار / Rental services"))}</td>
            <td class="num">1</td>
            <td class="num">${money(tax.subtotal)}</td>
            <td class="num">${tax.rate > 0 ? Math.round(tax.rate * 100) + "%" : "معفى"}</td>
            <td class="num">${money(tax.grand)}</td>
          </tr></tbody>
        </table>
        <div class="lq-doc-summary">
          <div class="lq-doc-notes">
            <strong>ملاحظات:</strong> ${esc(note)}<br>
            المحاسب المسؤول: <strong>${esc(acc)}</strong><br>
            تاريخ الطباعة: ${esc(new Date().toISOString().slice(0, 10))}
          </div>
          ${totals}
        </div>
        <div class="lq-doc-sign">
          <div><strong>الطرف الأول / الشركة</strong><br>${esc(COMPANY.ar)}</div>
          <div class="lq-doc-seal">الختم الرسمي</div>
          <div><strong>الطرف الثاني / العميل</strong></div>
        </div>
        ${footerBlock()}`,
      "lq-doc-invoice"
    );
  }

  function monthsBetween(start, end) {
    try {
      const a = new Date(start);
      const b = new Date(end);
      const days = Math.max(0, Math.round((b - a) / 86400000) + 1);
      return { days, months: Math.max(1, Math.round(days / 30)) };
    } catch (_e) {
      return { days: 0, months: 0 };
    }
  }

  function pageShell(pageNo, total, contractNo, edition, inner) {
    return `<section class="lq-lease-page">
      <div class="lq-lease-page-top">
        <span>رقم العقد: ${esc(contractNo)}</span>
        <span>الإصدار: ${esc(edition)}</span>
        <span>صفحة ${pageNo} من ${total}</span>
      </div>
      ${inner}
      <div class="lq-lease-page-foot">
        <span>توقيع مختصر للمستأجر: __________</span>
        <span>توقيع مختصر للشركة: __________</span>
      </div>
    </section>`;
  }

  function buildLeaseContractHtml(contract) {
    const c = contract || {};
    const client = byId("clients", c.client_id);
    const property = byId("properties", c.property_id);
    const dep = depositStatus(c);
    const tax = resolveTaxTreatment(c);
    const dur = monthsBetween(c.start_date, c.end_date);
    const annual = Number(c.rent_amount || 0) * 12;
    const contractNo = cleanText(c.contract_no || c.id, "—");
    const edition = (window.LQ_LEASE_PROTECTED && LQ_LEASE_PROTECTED.VERSION) || "LQ-LEASE-OM-2026.1";
    const articles = (window.LQ_LEASE_PROTECTED && LQ_LEASE_PROTECTED.ARTICLES) || [];
    const annexes = (window.LQ_LEASE_PROTECTED && LQ_LEASE_PROTECTED.ANNEXES) || [];
    const propLabel =
      typeof window.propertyLabel === "function" ? window.propertyLabel(property) : cleanText(property.name, "—");
    const unit = cleanText(c.unit_details, "") || cleanText(property.apartment_no || property.room_no, "—");

    const head = companyHeaderBlock("LEASE CONTRACT", "عقد إيجار", `<table>
      <tr><td>رقم العقد</td><td>${esc(contractNo)}</td></tr>
      <tr><td>التاريخ</td><td>${esc(cleanText(c.start_date, "—"))}</td></tr>
      <tr><td>الحالة</td><td>${esc(cleanText(c.status, "—"))}</td></tr>
      <tr><td>الإصدار</td><td>${esc(edition)}</td></tr>
    </table>`);

    // Group articles into pages of ~4
    const articleChunks = [];
    for (let i = 0; i < articles.length; i += 4) articleChunks.push(articles.slice(i, i + 4));
    const totalPages = 3 + articleChunks.length + 1; // cover+parties+finance + articles + annex/sign

    let page = 1;
    const pages = [];

    pages.push(
      pageShell(
        page++,
        totalPages,
        contractNo,
        edition,
        head +
          `<div class="lq-lease-cover">
            <h2>عقد إيجار محمي</h2>
            <p class="mini">مشاريع جودة الانطلاقة للخدمات · QUALITY OF LAUNCH PROJECTS LLC</p>
            <p>هذا العقد متعدد الصفحات ويتضمن الشروط العامة الكاملة والملاحق الإلزامية. لا يُعتد بنسخة مختصرة من الشروط.</p>
            <div class="lq-doc-grid" style="margin-top:18px">
              <div class="lq-doc-box"><h3>الطرف الأول</h3><p><strong>${esc(COMPANY.ar)}</strong><br>مدير ومشغل ومحصّل للأجرة<br>س.ت ${esc(COMPANY.cr)}<br>${esc(COMPANY.address)}</p></div>
              <div class="lq-doc-box"><h3>الطرف الثاني — المستأجر</h3><p><strong>${esc(cleanText(client.name, "—"))}</strong><br>هوية/جواز: ${esc(cleanText(c.tenant_id_no || client.national_id, "—"))}<br>هاتف: ${esc(cleanText(client.phone, "—"))}<br>بريد: ${esc(cleanText(client.email, "—"))}</p></div>
            </div>
          </div>`
      )
    );

    pages.push(
      pageShell(
        page++,
        totalPages,
        contractNo,
        edition,
        `<h3 class="lq-lease-h">بيانات الأطراف والعقار</h3>
        <div class="lq-doc-grid">
          ${clientBlock(client, c)}
          <div class="lq-doc-box"><h3>وصف العقار</h3><p>
            المبنى/الوحدة: ${esc(cleanText(propLabel, "—"))}<br>
            التفاصيل: ${esc(cleanText(unit, "—"))}<br>
            الموقع: ${esc(cleanText(property.location, "—"))}<br>
            نوع الاستعمال: ${esc(cleanText(c.contract_type, "سكني"))}<br>
            حالة التسليم: تُثبت بمحضر الاستلام والصور المؤرخة المرفقة.
          </p></div>
        </div>
        <div class="lq-doc-box"><h3>إقرار المستأجر</h3><p>يقر المستأجر بصحة جميع بياناته ومستنداته، وأن الإشعارات والمدفوعات والتسليم الصادرة عبر مشاريع جودة الانطلاقة صادرة عن الجهة المخولة بإدارة العقار.</p></div>`
      )
    );

    pages.push(
      pageShell(
        page++,
        totalPages,
        contractNo,
        edition,
        `<h3 class="lq-lease-h">البيانات المالية والمدة</h3>
        <table class="lq-doc-table">
          <tbody>
            <tr><td>بداية العقد</td><td>${esc(cleanText(c.start_date, "—"))}</td><td>نهاية العقد</td><td>${esc(cleanText(c.end_date, "—"))}</td></tr>
            <tr><td>المدة</td><td>${esc(String(dur.months))} شهرًا تقريبًا / ${esc(String(dur.days))} يومًا</td><td>دورة الدفع</td><td>${esc(cleanText(c.payment_cycle, "شهري"))}</td></tr>
            <tr><td>الأجرة الشهرية</td><td>${money(c.rent_amount)}</td><td>الإجمالي السنوي</td><td>${money(annual)}</td></tr>
            <tr><td>التأمين</td><td>${money(dep.required)}</td><td>حالة التأمين</td><td>${esc(dep.labelAr)}</td></tr>
            <tr><td>مهلة السداد</td><td>${esc(cleanText(c.grace_days, "5"))} يومًا</td><td>إشعار التجديد</td><td>${esc(cleanText(c.renewal_notice_days, "30"))} يومًا</td></tr>
            <tr><td colspan="2">المعاملة الضريبية</td><td colspan="2"><strong>${esc(tax.labelAr)}</strong><br><small>${esc(tax.labelEn)}</small></td></tr>
          </tbody>
        </table>
        <div class="lq-doc-box"><h3>قاعدة الدفع</h3><p>لا يُعتبر الدفع صحيحًا إلا بعد ظهوره في حساب الشركة أو إصدار سند قبض رسمي من النظام. ولا يُعتد بأي دفع نقدي دون سند رسمي.</p></div>`
      )
    );

    articleChunks.forEach((chunk) => {
      pages.push(
        pageShell(
          page++,
          totalPages,
          contractNo,
          edition,
          `<h3 class="lq-lease-h">الشروط العامة</h3>` +
            chunk
              .map(
                (a) =>
                  `<article class="lq-lease-article"><h4>المادة ${a.n} — ${esc(a.title)}</h4><p>${esc(a.body)}</p></article>`
              )
              .join("")
        )
      );
    });

    pages.push(
      pageShell(
        page++,
        totalPages,
        contractNo,
        edition,
        `<h3 class="lq-lease-h">الملاحق الإلزامية</h3>
        <p class="mini">لا يُعتبر العقد مكتملًا دون الملاحق التالية:</p>
        <ol class="lq-lease-annex">${annexes.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
        <h3 class="lq-lease-h" style="margin-top:18px">التوقيعات</h3>
        <div class="lq-doc-sign lq-lease-sign">
          <div><strong>الطرف الأول / المؤجر أو ممثله</strong><br>${esc(COMPANY.ar)}<br><br>التوقيع: __________<br>التاريخ: __________</div>
          <div class="lq-doc-seal">الختم الرسمي<br>رمز التحقق<br>${esc(edition)}</div>
          <div><strong>الطرف الثاني / المستأجر</strong><br>${esc(cleanText(client.name, "—"))}<br><br>التوقيع: __________<br>أقر بأنني قرأت العقد وفهمته</div>
        </div>
        <div class="lq-doc-box" style="margin-top:12px"><h3>الضامن (إن وجد)</h3><p>الاسم: __________ · التوقيع: __________ · التاريخ: __________</p></div>
        ${footerBlock()}`
      )
    );

    return wrapDoc(pages.join(""), "lq-doc-lease");
  }

  function buildReceiptHtml(invoice, payment) {
    const client = byId("clients", invoice.client_id);
    const contract = byId("contracts", invoice.contract_id);
    const acc = accountantName();
    const head = companyHeaderBlock(
      "RECEIPT VOUCHER",
      "إيصال قبض",
      `<table>
        <tr><td>رقم الإيصال</td><td>${esc(cleanText(payment.id, "—"))}</td></tr>
        <tr><td>التاريخ</td><td>${esc(cleanText(payment.payment_date, "—"))}</td></tr>
        <tr><td>الطريقة</td><td>${esc(cleanText(payment.method, "—"))}</td></tr>
        <tr><td>الفاتورة</td><td>${esc(cleanText(invoice.invoice_no, "—"))}</td></tr>
      </table>`
    );
    return wrapDoc(
      head +
        `<div class="lq-doc-grid">${clientBlock(client, contract)}<div class="lq-doc-box"><h3>مقابل الفاتورة</h3><p>${esc(cleanText(invoice.invoice_no, "—"))}<br>${esc(cleanText(invoice.description, "—"))}</p></div></div>
        <div class="lq-doc-totals"><table><tr><td>المبلغ المستلم · Amount Received</td><td>${money(payment.amount)}</td></tr></table></div>
        <p class="lq-doc-notes">${esc(cleanText(payment.note, "دفعة على الفاتورة"))}</p>
        <div class="lq-doc-sign"><div><strong>استلم بواسطة</strong>${esc(acc)}</div><div class="lq-doc-seal">الختم</div><div><strong>توقيع العميل</strong></div></div>
        ${footerBlock()}`,
      "lq-doc-receipt"
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
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Print</title>
      <link rel="stylesheet" href="${base}lq-print.css?v=lease3">
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
    buildLeaseContractHtml,
    buildReceiptHtml,
    printInvoiceDocument,
    downloadInvoicePdf,
    depositStatus,
    accountantName,
    invoiceTax,
    resolveTaxTreatment,
    cleanText,
  };
  window.printInvoiceDocument = printInvoiceDocument;
  window.downloadInvoicePdf = downloadInvoicePdf;
})();
