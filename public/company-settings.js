/* Quality of Launch Services LLC — editable company profile (defaults + helpers) */
window.DEFAULT_COMPANY_SETTINGS = {
  name_ar: 'جودة الانطلاقة للخدمات ل.ل.س',
  name_en: 'Quality of Launch Services LLC',
  cr_no: '1466316',
  postal_code: '611',
  po_box: '320',
  vat_rate: 0.05,
  vat_reg_no: '',
  logo_url: 'assets/logo-primary.png',
  description_ar: 'جودة الانطلاقة للخدمات ل.ل.س هي مؤسسة خدمية متخصصة في تقديم الخدمات المتعلقة بالعقارات، بالإضافة إلى خدمات الضيافة للمناسبات والعزاء، من خلال كادر وظيفي مترابط وذو خبرة طويلة في هذه المجالات، بما يضمن تقديم خدمات منظمة وموثوقة وبجودة عالية.',
  description_en: 'Quality of Launch Services LLC is a service-oriented company specializing in real estate-related services and hospitality services for various occasions, including events and condolence gatherings. The company operates with a well-coordinated professional team that has extensive experience in these fields, ensuring reliable, organized, and high-quality service delivery.',
  contacts: {
    customer_service: '25225026',
    hospitality_manager: '92204210',
  },
  bank: {
    name: 'Bank Muscat',
    accounts: [
      { name: 'Starting Quality Project', number: '0378063651660017', phone: '' },
      { name: 'Yaqoub Al Khusaibi', number: '0368001970950016', phone: '92200218' },
    ],
  },
};

window.CompanyProfile = {
  settings: { ...DEFAULT_COMPANY_SETTINGS },

  apply(next) {
    this.settings = { ...DEFAULT_COMPANY_SETTINGS, ...(next || {}) };
    if (next?.bank) this.settings.bank = { ...DEFAULT_COMPANY_SETTINGS.bank, ...next.bank };
    if (next?.contacts) this.settings.contacts = { ...DEFAULT_COMPANY_SETTINGS.contacts, ...next.contacts };
    return this.settings;
  },

  logoUrl() {
    const p = this.settings.logo_url || 'assets/logo-primary.png';
    if (/^https?:\/\//i.test(p)) return p;
    if (typeof window !== 'undefined' && window.location?.href) {
      try { return new URL(p, window.location.href).href; } catch (e) { /* fall through */ }
    }
    return p;
  },

  vatBreakdown(grossAmount) {
    const rate = Number(this.settings.vat_rate ?? 0.05);
    const gross = Number(grossAmount || 0);
    if (!rate || rate <= 0) return { subtotal: gross, vat: 0, total: gross, rate: 0 };
    const subtotal = gross / (1 + rate);
    const vat = gross - subtotal;
    return { subtotal, vat, total: gross, rate };
  },

  escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  },

  documentStyles() {
    return `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap');
:root{--gold:#b8892f;--gold-light:#d4af37;--ink:#1a1a1a;--muted:#5c5348;--line:#e8dcc8;--paper:#fdfbf7;--accent:#8b6914}
*{box-sizing:border-box}
body{margin:0;font-family:"Outfit","Tajawal",Arial,sans-serif;color:var(--ink);background:#fff}
.qls-doc{position:relative;background:var(--paper);padding:32px;max-width:920px;margin:0 auto;overflow:hidden}
.qls-doc:before{content:"";position:absolute;inset:0;background:url('${this.logoUrl()}') center 42% / 58% no-repeat;opacity:.045;pointer-events:none;z-index:0}
.qls-doc>*{position:relative;z-index:1}
.qls-doc-header{text-align:center;margin-bottom:22px;padding-bottom:18px;border-bottom:2px solid var(--gold-light)}
.qls-logo{width:min(220px,72vw);height:auto;object-fit:contain;filter:drop-shadow(0 8px 18px rgba(184,137,47,.18));margin:0 auto 12px;display:block}
.qls-names{margin:0 0 8px}
.qls-names .ar{font-family:"Tajawal",sans-serif;font-size:1.35rem;font-weight:800;color:var(--gold);margin:0 0 4px}
.qls-names .en{font-family:"Cormorant Garamond",serif;font-size:1.15rem;font-weight:700;color:var(--ink);margin:0;letter-spacing:.02em}
.qls-intro{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;text-align:justify}
.qls-intro p{margin:0;font-size:11px;line-height:1.75;color:var(--muted)}
.qls-intro .ar{direction:rtl;font-family:"Tajawal",sans-serif}
.qls-intro .en{direction:ltr;font-family:"Outfit",sans-serif}
.qls-meta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:20px 0}
.qls-card{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:rgba(255,255,255,.82);box-shadow:0 4px 16px rgba(139,105,20,.06)}
.qls-card h4{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:var(--gold);font-weight:700}
.qls-card p,.qls-card li{margin:0 0 6px;font-size:12px;line-height:1.65;color:var(--ink)}
.qls-card ul{margin:0;padding:0 0 0 18px}
.qls-card .label{color:var(--muted);font-size:11px;display:block}
.qls-card .value{font-weight:600}
.qls-vat-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;background:linear-gradient(135deg,#fff8e8,#f5ecd6);border:1px solid var(--gold-light);color:var(--gold);font-size:11px;font-weight:700;margin-top:10px}
.qls-title-row{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:16px;margin:22px 0 18px}
.qls-title-row h1{margin:0;font-size:1.6rem;color:var(--ink)}
.qls-title-row .meta{font-size:12px;color:var(--muted);line-height:1.8}
.qls-table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}
.qls-table th,.qls-table td{border:1px solid var(--line);padding:10px 12px;text-align:right}
.qls-table th{background:linear-gradient(180deg,#faf6ee,#f3ead8);color:var(--gold);font-weight:700}
.qls-table td{color:var(--ink)}
.qls-table.ltr th,.qls-table.ltr td{text-align:left}
.qls-totals{margin-right:auto;max-width:360px;width:100%}
.qls-totals .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--line);font-size:13px}
.qls-totals .row.total{font-size:15px;font-weight:800;color:var(--gold);border-bottom:0;padding-top:12px}
.qls-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:36px;padding-top:18px;border-top:1px solid var(--line)}
.qls-signatures .sig{min-height:72px;border-bottom:1px solid #bbb;font-size:11px;color:var(--muted);padding-top:8px}
.qls-footer{margin-top:24px;padding-top:14px;border-top:1px solid var(--line);font-size:10px;color:var(--muted);text-align:center;line-height:1.7}
@media(max-width:720px){.qls-intro{grid-template-columns:1fr}.qls-meta-grid{grid-template-columns:1fr}.qls-signatures{grid-template-columns:1fr}}
@media print{body{background:#fff}.qls-doc{padding:18px;max-width:none}.qls-doc:before{opacity:.035}}`;
  },

  headerHtml() {
    const s = this.settings;
    const bankAccounts = (s.bank?.accounts || []).map((a, i) => `
      <li><span class="label">Account ${i + 1}</span><span class="value">${this.escapeHtml(a.name)}</span><br><span class="value" dir="ltr">${this.escapeHtml(a.number)}</span>${a.phone ? `<br><span class="label">Phone</span> <span class="value">${this.escapeHtml(a.phone)}</span>` : ''}</li>
    `).join('');
    return `
      <header class="qls-doc-header">
        <img class="qls-logo" src="${this.escapeHtml(this.logoUrl())}" alt="${this.escapeHtml(s.name_en)}">
        <div class="qls-names">
          <p class="ar">${this.escapeHtml(s.name_ar)}</p>
          <p class="en">${this.escapeHtml(s.name_en)}</p>
        </div>
        <div class="qls-intro">
          <p class="ar">${this.escapeHtml(s.description_ar)}</p>
          <p class="en">${this.escapeHtml(s.description_en)}</p>
        </div>
        <span class="qls-vat-badge">Tax Invoice · فاتورة ضريبية · VAT ${Math.round((s.vat_rate || 0) * 100)}%</span>
      </header>
      <div class="qls-meta-grid">
        <div class="qls-card">
          <h4>Company · المؤسسة</h4>
          <p><span class="label">C.R. No.</span> <span class="value">${this.escapeHtml(s.cr_no)}</span></p>
          <p><span class="label">Postal Code</span> <span class="value">${this.escapeHtml(s.postal_code)}</span></p>
          <p><span class="label">P.O. Box</span> <span class="value">${this.escapeHtml(s.po_box)}</span></p>
          ${s.vat_reg_no ? `<p><span class="label">VAT Reg.</span> <span class="value">${this.escapeHtml(s.vat_reg_no)}</span></p>` : ''}
          <p><span class="label">Customer Service</span> <span class="value">${this.escapeHtml(s.contacts?.customer_service)}</span></p>
          <p><span class="label">Hospitality</span> <span class="value">${this.escapeHtml(s.contacts?.hospitality_manager)}</span></p>
        </div>
        <div class="qls-card">
          <h4>${this.escapeHtml(s.bank?.name || 'Bank')} · البنك</h4>
          <ul>${bankAccounts}</ul>
        </div>
      </div>`;
  },

  invoiceHtml(inv, client, prop, contract) {
    const v = this.vatBreakdown(inv.amount);
    const rem = Math.max(0, Number(inv.amount) - Number(inv.paid_amount || 0));
    const paidVat = this.vatBreakdown(inv.paid_amount);
    const remVat = this.vatBreakdown(rem);
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${this.escapeHtml(inv.invoice_no)}</title><style>${this.documentStyles()}</style></head><body>
      <article class="qls-doc">
        ${this.headerHtml()}
        <div class="qls-title-row">
          <div><h1>فاتورة ضريبية / Tax Invoice</h1><div class="meta">Sultanate of Oman · سلطنة عُمان</div></div>
          <div class="meta" dir="ltr" style="text-align:left">
            <div><b>${this.escapeHtml(inv.invoice_no)}</b></div>
            Issue: ${this.escapeHtml(inv.issue_date)}<br>
            Due: ${this.escapeHtml(inv.due_date)}<br>
            Status: ${this.escapeHtml(inv.status)}
          </div>
        </div>
        <div class="qls-meta-grid">
          <div class="qls-card"><h4>Bill To · العميل</h4><p><span class="value">${this.escapeHtml(client?.name)}</span></p><p>${this.escapeHtml(client?.phone || '')}</p><p>${this.escapeHtml(client?.email || '')}</p><p>${this.escapeHtml(client?.national_id || '')}</p></div>
          <div class="qls-card"><h4>Contract / Property · العقد والعقار</h4><p><span class="label">Contract</span> <span class="value">${this.escapeHtml(contract?.contract_no || contract?.id || '')}</span></p><p><span class="value">${this.escapeHtml(prop?.name || '')}</span></p><p>${this.escapeHtml(prop?.location || '')}</p></div>
        </div>
        <table class="qls-table"><thead><tr><th>الوصف / Description</th><th>المبلغ الأساسي / Subtotal (OMR)</th><th>ض.ق.م / VAT (OMR)</th><th>الإجمالي / Total (OMR)</th></tr></thead><tbody><tr><td>${this.escapeHtml(inv.description || 'Service')}</td><td>${v.subtotal.toFixed(3)}</td><td>${v.vat.toFixed(3)}</td><td>${v.total.toFixed(3)}</td></tr></tbody></table>
        <div class="qls-totals">
          <div class="row"><span>Subtotal (Excl. VAT)</span><span>${v.subtotal.toFixed(3)} OMR</span></div>
          <div class="row"><span>VAT ${Math.round(v.rate * 100)}%</span><span>${v.vat.toFixed(3)} OMR</span></div>
          <div class="row total"><span>Total (Incl. VAT)</span><span>${v.total.toFixed(3)} OMR</span></div>
          <div class="row"><span>Paid</span><span>${paidVat.total.toFixed(3)} OMR</span></div>
          <div class="row"><span>Balance Due</span><span>${remVat.total.toFixed(3)} OMR</span></div>
        </div>
        <div class="qls-signatures"><div class="sig">Prepared By · أعدّها</div><div class="sig">Client Signature · توقيع العميل</div><div class="sig">Company Stamp · ختم المؤسسة</div></div>
        <footer class="qls-footer">${this.escapeHtml(this.settings.name_en)} · ${this.escapeHtml(this.settings.name_ar)}<br>C.R. ${this.escapeHtml(this.settings.cr_no)} · P.O. Box ${this.escapeHtml(this.settings.po_box)} · Postal ${this.escapeHtml(this.settings.postal_code)}</footer>
      </article></body></html>`;
  },

  contractHtml(c, client, prop) {
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${this.escapeHtml(c.contract_no || c.id)}</title><style>${this.documentStyles()}</style></head><body>
      <article class="qls-doc">
        ${this.headerHtml()}
        <div class="qls-title-row">
          <div><h1>عقد إيجار / Lease Contract</h1><div class="meta">${this.escapeHtml(c.contract_no || c.id)} · ${this.escapeHtml(c.contract_type || 'Residential')}</div></div>
          <div class="meta">Sultanate of Oman · سلطنة عُمان</div>
        </div>
        <table class="qls-table"><thead><tr><th>البند</th><th>التفاصيل</th><th>Item</th><th>Details</th></tr></thead><tbody>
          <tr><td>المستأجر</td><td>${this.escapeHtml(client?.name || '')}</td><td>Tenant</td><td>${this.escapeHtml(client?.name || '')}</td></tr>
          <tr><td>الهوية/السجل</td><td>${this.escapeHtml(c.tenant_id_no || client?.national_id || '')}</td><td>ID/CR</td><td>${this.escapeHtml(c.tenant_id_no || client?.national_id || '')}</td></tr>
          <tr><td>العقار</td><td>${this.escapeHtml(prop?.name || '')}</td><td>Property</td><td>${this.escapeHtml(prop?.name || '')}</td></tr>
          <tr><td>الوحدة</td><td>${this.escapeHtml(c.unit_details || prop?.location || '')}</td><td>Unit</td><td>${this.escapeHtml(c.unit_details || prop?.location || '')}</td></tr>
          <tr><td>البداية</td><td>${this.escapeHtml(c.start_date)}</td><td>Start</td><td>${this.escapeHtml(c.start_date)}</td></tr>
          <tr><td>النهاية</td><td>${this.escapeHtml(c.end_date)}</td><td>End</td><td>${this.escapeHtml(c.end_date)}</td></tr>
          <tr><td>الإيجار</td><td>${Number(c.rent_amount || 0).toFixed(3)} OMR</td><td>Rent</td><td>${Number(c.rent_amount || 0).toFixed(3)} OMR</td></tr>
          <tr><td>التأمين</td><td>${Number(c.deposit_amount || 0).toFixed(3)} OMR</td><td>Deposit</td><td>${Number(c.deposit_amount || 0).toFixed(3)} OMR</td></tr>
        </tbody></table>
        <div class="qls-card" style="margin-top:18px"><h4>Protection Terms · الشروط القانونية</h4><p>${this.escapeHtml(c.legal_terms || '')}</p></div>
        <div class="qls-signatures"><div class="sig">Tenant Signature · توقيع المستأجر</div><div class="sig">${this.escapeHtml(c.company_signatory || this.settings.name_en)}</div><div class="sig">Company Stamp · ختم المؤسسة</div></div>
        <footer class="qls-footer">${this.escapeHtml(this.settings.name_en)} · Bank: ${this.escapeHtml(this.settings.bank?.name)}</footer>
      </article></body></html>`;
  },

  dashboardIntroHtml() {
    const s = this.settings;
    return `
      <div class="brand-hero">
        <img class="brand-hero-logo" src="${this.escapeHtml(this.logoUrl())}" alt="${this.escapeHtml(s.name_en)}">
        <div class="brand-hero-copy">
          <h2 class="brand-hero-ar">${this.escapeHtml(s.name_ar)}</h2>
          <h3 class="brand-hero-en">${this.escapeHtml(s.name_en)}</h3>
          <div class="brand-hero-desc">
            <p class="ar">${this.escapeHtml(s.description_ar)}</p>
            <p class="en">${this.escapeHtml(s.description_en)}</p>
          </div>
        </div>
      </div>`;
  },
};
