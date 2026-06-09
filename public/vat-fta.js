/* Phase 5 — FTA e-invoicing: QR on invoices + VAT accountant reports */
window.VatFTA = {
  qrPayload(inv, vat) {
    const s = CompanyProfile?.settings || {};
    const v = vat || CompanyProfile.vatBreakdown(inv?.amount);
    return [
      s.name_en || 'Quality of Launch Services LLC',
      `CR:${s.cr_no || ''}`,
      `VAT:${s.vat_reg_no || 'N/A'}`,
      `INV:${inv?.invoice_no || ''}`,
      `ISS:${inv?.issue_date || ''}`,
      `DUE:${inv?.due_date || ''}`,
      `SUB:${v.subtotal.toFixed(3)}`,
      `VTX:${v.vat.toFixed(3)}`,
      `TOT:${v.total.toFixed(3)}`,
      `STS:${inv?.status || ''}`,
    ].join('|');
  },

  qrImageUrl(payload) {
    const data = encodeURIComponent(String(payload || '').slice(0, 800));
    return `https://api.qrserver.com/v1/create-qr-code/?size=148x148&margin=6&data=${data}`;
  },

  invoiceQrHtml(inv, vat) {
    const payload = this.qrPayload(inv, vat);
    const url = this.qrImageUrl(payload);
    return `<aside class="qls-fta-qr">
      <img src="${url}" width="148" height="148" alt="FTA QR" crossorigin="anonymous">
      <div class="qls-fta-qr-meta">
        <strong>رمز التحقق · FTA QR</strong>
        <span class="mini">امسح للتحقق من الفاتورة</span>
        <code dir="ltr">${CompanyProfile.escapeHtml(payload.slice(0, 120))}…</code>
      </div>
    </aside>`;
  },

  monthKey(d) {
    const x = d instanceof Date ? d : new Date(String(d) + 'T00:00:00');
    if (Number.isNaN(x.getTime())) return '';
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
  },

  invoicesForMonth(month) {
    const key = month || this.monthKey(new Date());
    return (Jawdah?.data?.invoices || []).filter(inv => String(inv.issue_date || '').startsWith(key));
  },

  rowVat(inv) {
    return CompanyProfile.vatBreakdown(inv.amount);
  },

  build(month) {
    const s = CompanyProfile?.settings || {};
    const m = month || this.monthKey(new Date());
    const rows = this.invoicesForMonth(m).map(inv => {
      const v = this.rowVat(inv);
      const client = typeof byId === 'function' ? byId('clients', inv.client_id) : {};
      return { inv, client, v, collected: CompanyProfile.vatBreakdown(inv.paid_amount) };
    });
    const totals = rows.reduce(
      (acc, r) => {
        acc.billed += r.v.total;
        acc.subtotal += r.v.subtotal;
        acc.vat += r.v.vat;
        acc.collected += r.collected.total;
        acc.vatCollected += r.collected.vat;
        if (String(r.inv.status || '').toLowerCase() !== 'paid') acc.open += Math.max(0, r.v.total - r.collected.total);
        return acc;
      },
      { billed: 0, subtotal: 0, vat: 0, collected: 0, vatCollected: 0, open: 0 }
    );
    const checks = [
      { label: 'رقم تسجيل VAT', ok: !!String(s.vat_reg_no || '').trim(), detail: s.vat_reg_no || 'غير مسجل — أضفه من إعدادات المؤسسة' },
      { label: 'نسبة VAT', ok: Number(s.vat_rate ?? 0.05) > 0, detail: `${Math.round(Number(s.vat_rate ?? 0.05) * 100)}%` },
      { label: 'QR على الفواتير', ok: true, detail: 'مفعّل تلقائياً على كل فاتورة ضريبية' },
      { label: `فواتير الشهر ${m}`, ok: rows.length > 0, detail: `${rows.length} فاتورة` },
      { label: 'CR مسجل', ok: !!String(s.cr_no || '').trim(), detail: s.cr_no || '—' },
    ];
    const score = checks.length ? Math.round((checks.filter(c => c.ok).length / checks.length) * 100) : 0;
    return { month: m, settings: s, rows, totals, checks, score };
  },

  reportHtml(report) {
    const esc = CompanyProfile?.escapeHtml?.bind(CompanyProfile) || (x => String(x ?? ''));
    const s = report.settings || {};
    const body = report.rows.map(r =>
      `<tr><td>${esc(r.inv.invoice_no)}</td><td>${esc(r.inv.issue_date)}</td><td>${esc(r.client?.name)}</td><td>${esc(r.v.subtotal.toFixed(3))}</td><td>${esc(r.v.vat.toFixed(3))}</td><td>${esc(r.v.total.toFixed(3))}</td><td>${esc(r.inv.status)}</td></tr>`
    ).join('') || '<tr><td colspan="7">لا فواتير في هذا الشهر</td></tr>';
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
      body{font-family:Tajawal,Arial;padding:24px;background:#fdfbf7;color:#111}
      h1{color:#92400e} table{width:100%;border-collapse:collapse;font-size:13px;margin:16px 0}
      th,td{border:1px solid #ddd;padding:8px;text-align:right} th{background:#f5efe6}
      .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}
      .kpi{border:1px solid #ddd;padding:12px;border-radius:10px;background:#fff}
    </style></head><body>
      <h1>تقرير VAT — ${esc(report.month)}</h1>
      <p>${esc(s.name_ar)} · CR ${esc(s.cr_no)} · VAT ${esc(s.vat_reg_no || '—')}</p>
      <div class="kpis">
        <div class="kpi"><span>إجمالي الفوترة</span><strong>${esc(report.totals.billed.toFixed(3))} OMR</strong></div>
        <div class="kpi"><span>ض.ق.م مستحقة</span><strong>${esc(report.totals.vat.toFixed(3))} OMR</strong></div>
        <div class="kpi"><span>المحصّل</span><strong>${esc(report.totals.collected.toFixed(3))} OMR</strong></div>
      </div>
      <table><thead><tr><th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>أساسي</th><th>VAT</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>${body}</tbody></table>
      <p>جاهزية FTA: ${esc(report.score)}%</p>
    </body></html>`;
  },

  async downloadReportPdf(month) {
    const report = this.build(month);
    if (typeof downloadHtmlAsPdf !== 'function') return toast('PDF غير متاح', true);
    await downloadHtmlAsPdf(this.reportHtml(report), `vat-report-${report.month}.pdf`);
  },

  exportCsv(month) {
    const report = this.build(month);
    const lines = [
      ['invoice_no', 'issue_date', 'client', 'subtotal', 'vat', 'total', 'status', 'paid'],
      ...report.rows.map(r => [
        r.inv.invoice_no, r.inv.issue_date, r.client?.name || '',
        r.v.subtotal.toFixed(3), r.v.vat.toFixed(3), r.v.total.toFixed(3),
        r.inv.status, Number(r.inv.paid_amount || 0).toFixed(3),
      ]),
    ];
    const csv = lines.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    if (typeof downloadFile === 'function') downloadFile(`vat-report-${report.month}.csv`, csv, 'text/csv;charset=utf-8');
  },

  render() {
    const host = document.getElementById('vatFtaBox');
    if (!host) return;
    const monthInput = document.getElementById('vatFtaMonth');
    const month = monthInput?.value || this.monthKey(new Date());
    if (monthInput && !monthInput.value) monthInput.value = month;
    const report = this.build(month);
    Jawdah.vatFtaReport = report;

    const checkHtml = report.checks.map(c =>
      `<div class="vat-fta-check ${c.ok ? 'ok' : 'warn'}">${typeof ic === 'function' ? ic(c.ok ? 'circle-check-big' : 'triangle-alert') : ''}<div><strong>${c.label}</strong><span class="mini">${c.detail}</span></div></div>`
    ).join('');

    const rowsHtml = report.rows.length
      ? report.rows.map(r => `<tr>
          <td>${r.inv.invoice_no}</td>
          <td>${r.inv.issue_date}</td>
          <td>${r.client?.name || '—'}</td>
          <td dir="ltr">${r.v.subtotal.toFixed(3)}</td>
          <td dir="ltr">${r.v.vat.toFixed(3)}</td>
          <td dir="ltr">${r.v.total.toFixed(3)}</td>
          <td>${typeof badge === 'function' ? badge(r.inv.status) : r.inv.status}</td>
          <td><button class="ghost" onclick="printInvoice('${r.inv.id}')">معاينة</button></td>
        </tr>`).join('')
      : '<tr><td colspan="8">لا فواتير في هذا الشهر — أنشئ فاتورة من قسم الفواتير</td></tr>';

    host.innerHTML = `
      <div class="vat-fta-kpis">
        <div class="vat-fta-kpi"><span>جاهزية FTA</span><strong class="dash-count" data-percent="1" data-value="${report.score}">0%</strong></div>
        <div class="vat-fta-kpi"><span>فواتير الشهر</span><strong class="dash-count" data-value="${report.rows.length}">0</strong></div>
        <div class="vat-fta-kpi"><span>ض.ق.م الشهر</span><strong class="dash-count" data-money="1" data-value="${Math.round(report.totals.vat * 1000) / 1000}">0</strong></div>
        <div class="vat-fta-kpi"><span>المحصّل</span><strong class="dash-count" data-money="1" data-value="${Math.round(report.totals.collected * 1000) / 1000}">0</strong></div>
      </div>
      <div class="card glass-float-panel vat-fta-toolbar">
        <label class="vat-fta-month">شهر التقرير<input type="month" id="vatFtaMonth" value="${month}" onchange="VatFTA.render()"></label>
        <button class="ghost" onclick="VatFTA.downloadReportPdf(document.getElementById('vatFtaMonth').value)">${typeof ic === 'function' ? ic('file-down') : ''} PDF للمحاسب</button>
        <button class="ghost" onclick="VatFTA.exportCsv(document.getElementById('vatFtaMonth').value)">${typeof ic === 'function' ? ic('table') : ''} CSV</button>
        <button class="ghost" onclick="showSection('company-settings')">${typeof ic === 'function' ? ic('building-2') : ''} VAT Reg</button>
        <button class="ghost" onclick="showSection('invoices')">${typeof ic === 'function' ? ic('receipt') : ''} الفواتير</button>
      </div>
      <div class="vat-fta-layout">
        <div class="card glass-float-panel">
          <h3>${typeof ic === 'function' ? ic('qr-code', 'title-ic') : ''} امتثال FTA / الفوترة الإلكترونية</h3>
          <p class="mini">كل فاتورة ضريبية تتضمن QR للتحقق · تقرير شهري جاهز للمحاسب · Sultanate of Oman VAT ${Math.round(Number(report.settings.vat_rate ?? 0.05) * 100)}%</p>
          <div class="vat-fta-checks">${checkHtml}</div>
        </div>
        <div class="card glass-float-panel vat-fta-qr-demo">
          <h3>نموذج QR على الفاتورة</h3>
          ${report.rows[0]
            ? this.invoiceQrHtml(report.rows[0].inv, report.rows[0].v).replace('qls-fta-qr', 'qls-fta-qr demo')
            : `<p class="mini">أنشئ فاتورة لعرض رمز QR</p>`}
        </div>
      </div>
      <div class="card glass-float-panel">
        <h3>${typeof ic === 'function' ? ic('receipt', 'title-ic') : ''} سجل VAT — ${month}</h3>
        <div class="table-scroll"><table><thead><tr><th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>أساسي</th><th>VAT</th><th>الإجمالي</th><th>الحالة</th><th></th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
      </div>`;

    if (typeof animateDashCounts === 'function') animateDashCounts(host);
    if (typeof paintIcons === 'function') paintIcons(host);
  },
};

function renderVatFta() {
  VatFTA.render();
}
