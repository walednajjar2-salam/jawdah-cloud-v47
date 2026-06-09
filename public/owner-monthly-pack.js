/* Phase 6 — Owner Monthly Pack: unified executive + VAT + compliance + renewal report */
window.OwnerMonthlyPack = {
  monthKey(d) {
    const x = d instanceof Date ? d : new Date(String(d) + 'T00:00:00');
    if (Number.isNaN(x.getTime())) return new Date().toISOString().slice(0, 7);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
  },

  monthLabel(month) {
    const [y, m] = String(month || '').split('-').map(Number);
    if (!y || !m) return month || '—';
    return new Date(y, m - 1, 1).toLocaleDateString('ar-OM', { month: 'long', year: 'numeric' });
  },

  invoicesForMonth(month) {
    return (Jawdah?.data?.invoices || []).filter(inv => String(inv.issue_date || '').startsWith(month));
  },

  paymentsForMonth(month) {
    return (Jawdah?.data?.payments || []).filter(p => String(p.payment_date || '').startsWith(month));
  },

  build(month) {
    const m = month || this.monthKey(new Date());
    const snap = typeof buildExecutiveSnapshot === 'function' ? buildExecutiveSnapshot() : {};
    const k = snap.k || Jawdah?.dashboard?.kpis || {};
    const vat = window.VatFTA ? VatFTA.build(m) : null;
    const compliance = window.ComplianceLayer ? ComplianceLayer.build() : null;
    const renewal = window.RenewalEngine ? RenewalEngine.build() : null;
    const monthInvoices = this.invoicesForMonth(m);
    const monthPayments = this.paymentsForMonth(m);
    const monthBilled = monthInvoices.reduce((s, i) => s + Number(i.amount || 0), 0);
    const monthCollected = monthPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const monthVat = monthInvoices.reduce((s, i) => s + (CompanyProfile?.vatBreakdown(i.amount)?.vat || 0), 0);
    const renewalSoon = (renewal?.recommendations || []).filter(r => r.milestone !== 'expired').slice(0, 8);
    const actions = (snap.priorities || []).slice(0, 5);
    const gisSummary = {
      total: snap.aptTotal || 0,
      rented: snap.aptRented || 0,
      vacant: snap.aptVacant || 0,
      occ: snap.aptOcc || 0,
      short: (snap.aptRows || []).filter(r => r.shortContract).length,
    };
    const healthScore = Math.round(
      (Number(snap.portfolioScore || 0) * 0.35) +
      (Number(compliance?.avgScore || 100) * 0.25) +
      (Number(vat?.score || 80) * 0.2) +
      (Number(snap.collectionRate || 0) * 0.2)
    );
    return {
      month: m,
      monthLabel: this.monthLabel(m),
      generatedAt: new Date().toLocaleString('ar-OM'),
      snap,
      k,
      vat,
      compliance,
      renewal,
      monthInvoices,
      monthPayments,
      monthBilled,
      monthCollected,
      monthVat,
      renewalSoon,
      actions,
      gisSummary,
      healthScore,
      settings: CompanyProfile?.settings || {},
    };
  },

  packHtml(pack) {
    const esc = CompanyProfile?.escapeHtml?.bind(CompanyProfile) || (x => String(x ?? ''));
    const s = pack.settings;
    const aptRows = (pack.snap.aptRows || []).map(r =>
      `<tr class="${r.shortContract ? 'short' : ''}"><td>${esc(r.no)}</td><td>${esc(r.statusAr)}</td><td>${esc(r.tenant)}</td><td>${esc(typeof money === 'function' ? money(r.rent) : r.rent)}</td><td>${esc(r.end)}</td></tr>`
    ).join('') || '<tr><td colspan="5">—</td></tr>';
    const actionRows = pack.actions.map(a =>
      `<tr><td>${esc(a.title)}</td><td>${esc(a.detail)}</td><td>${esc(a.label)}</td></tr>`
    ).join('') || '<tr><td colspan="3">لا إجراءات عاجلة</td></tr>';
    const renewalRows = pack.renewalSoon.map(r =>
      `<tr><td>${esc(r.aptNo)}</td><td>${esc(r.client?.name)}</td><td>${esc(r.contract.end_date)}</td><td>${esc(r.meta?.label || '')}</td><td>${esc(typeof money === 'function' ? money(r.recommendedRent) : r.recommendedRent)}</td></tr>`
    ).join('') || '<tr><td colspan="5">لا تجديدات قريبة</td></tr>';
    const invRows = pack.monthInvoices.map(inv => {
      const v = CompanyProfile.vatBreakdown(inv.amount);
      const client = typeof byId === 'function' ? byId('clients', inv.client_id) : {};
      return `<tr><td>${esc(inv.invoice_no)}</td><td>${esc(inv.issue_date)}</td><td>${esc(client?.name)}</td><td>${esc(v.total.toFixed(3))}</td><td>${esc(inv.status)}</td></tr>`;
    }).join('') || '<tr><td colspan="5">لا فواتير هذا الشهر</td></tr>';
    const flow6 = pack.renewal?.totals
      ? `<p>تدفق 6 أشهر — متوقع: ${esc(typeof money === 'function' ? money(pack.renewal.totals.baseline6m) : pack.renewal.totals.baseline6m)} · أفضل: ${esc(typeof money === 'function' ? money(pack.renewal.totals.optimistic6m) : pack.renewal.totals.optimistic6m)} · حذر: ${esc(typeof money === 'function' ? money(pack.renewal.totals.pessimistic6m) : pack.renewal.totals.pessimistic6m)}</p>`
      : '';

    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
      body{font-family:Tajawal,Arial,sans-serif;margin:0;padding:28px;background:#fdfbf7;color:#1a1a1a}
      .pack{max-width:820px;margin:0 auto}
      h1{margin:0 0 6px;font-size:24px;color:#92400e}
      h2{font-size:16px;margin:24px 0 10px;color:#78350f;border-bottom:1px solid #e8dcc8;padding-bottom:6px}
      .meta{color:#555;font-size:13px;margin-bottom:20px;line-height:1.7}
      .hero{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}
      .hero div{padding:14px;border:1px solid #ddd;border-radius:12px;background:#fff;text-align:center}
      .hero span{font-size:11px;color:#666;display:block;margin-bottom:6px}
      .hero b{font-size:20px;color:#92400e}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
      th,td{border:1px solid #ddd;padding:8px;text-align:right}
      th{background:#f5efe6}
      tr.short{background:#fee2e2}
      .summary-box{padding:14px;border-radius:12px;background:#fff8e8;border:1px solid #d4af37;margin:12px 0;font-size:13px;line-height:1.7}
      footer{margin-top:28px;font-size:11px;color:#666;border-top:1px solid #ddd;padding-top:12px;text-align:center}
    </style></head><body><article class="pack">
      <img src="${esc(CompanyProfile.logoUrl())}" alt="logo" style="height:64px;display:block;margin:0 auto 12px">
      <h1 style="text-align:center">تقرير المالك الشهري</h1>
      <div class="meta" style="text-align:center">${esc(s.name_ar)} · ${esc(pack.monthLabel)} · ${esc(pack.generatedAt)}</div>
      <div class="hero">
        <div><span>مؤشر الصحة الشامل</span><b>${esc(pack.healthScore)}%</b></div>
        <div><span>الإشغال</span><b>${esc(pack.gisSummary.occ)}%</b></div>
        <div><span>التحصيل</span><b>${esc(pack.snap.collectionRate || 0)}%</b></div>
        <div><span>الامتثال</span><b>${esc(pack.compliance?.avgScore ?? '—')}%</b></div>
      </div>
      <div class="summary-box">
        <strong>ملخص تنفيذي — ${esc(pack.monthLabel)}</strong><br>
        فوترة الشهر: ${esc(typeof money === 'function' ? money(pack.monthBilled) : pack.monthBilled)} ·
        تحصيل الشهر: ${esc(typeof money === 'function' ? money(pack.monthCollected) : pack.monthCollected)} ·
        ض.ق.م: ${esc(typeof money === 'function' ? money(pack.monthVat) : pack.monthVat.toFixed(3))} ·
        FTA: ${esc(pack.vat?.score ?? '—')}% ·
        شقق: ${esc(pack.gisSummary.rented)}/${esc(pack.gisSummary.total)} مستأجرة
        ${flow6}
      </div>
      <h2>1 — الرادار المالي</h2>
      <div class="hero">
        <div><span>إجمالي الفوترة</span><b>${esc(typeof money === 'function' ? money(pack.k.billed) : pack.k.billed)}</b></div>
        <div><span>المحصّل</span><b>${esc(typeof money === 'function' ? money(pack.k.paid) : pack.k.paid)}</b></div>
        <div><span>المتأخرات</span><b>${esc(typeof money === 'function' ? money(pack.k.overdue) : pack.k.overdue)}</b></div>
        <div><span>صافي الحسابات</span><b>${esc(typeof money === 'function' ? money(pack.k.net) : pack.k.net)}</b></div>
      </div>
      <h2>2 — أهم 5 إجراءات للشهر القادم</h2>
      <table><thead><tr><th>المهمة</th><th>التفاصيل</th><th>الإجراء</th></tr></thead><tbody>${actionRows}</tbody></table>
      <h2>3 — كشف الشقق · GIS نزوى</h2>
      <table><thead><tr><th>الشقة</th><th>الحالة</th><th>المستأجر</th><th>الإيجار</th><th>نهاية العقد</th></tr></thead><tbody>${aptRows}</tbody></table>
      <h2>4 — خط التجديد (90 يوم)</h2>
      <table><thead><tr><th>الشقة</th><th>المستأجر</th><th>النهاية</th><th>الحالة</th><th>إيجار مقترح</th></tr></thead><tbody>${renewalRows}</tbody></table>
      <h2>5 — فواتير الشهر + VAT</h2>
      <table><thead><tr><th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>${invRows}</tbody></table>
      <p class="meta">جاهزية FTA: ${esc(pack.vat?.score ?? '—')}% · VAT Reg: ${esc(s.vat_reg_no || '—')} · CR: ${esc(s.cr_no)}</p>
      <footer>${esc(s.name_en)} · Quality of Launch Services LLC · Sultanate of Oman<br>تقرير المالك الشهري — للإدارة والمحاسبة · لا يُعتمد رسمياً دون مراجعة</footer>
    </article></body></html>`;
  },

  async downloadPdf(month) {
    const pack = this.build(month);
    if (typeof downloadHtmlAsPdf !== 'function') return toast('PDF غير متاح', true);
    await downloadHtmlAsPdf(this.packHtml(pack), `owner-monthly-pack-${pack.month}.pdf`);
  },

  exportExcel(month) {
    const pack = this.build(month);
    if (!window.XLSX) return this.exportCsv(month);
    const wb = XLSX.utils.book_new();
    const summary = [[
      'الشهر', 'مؤشر الصحة', 'الإشغال %', 'التحصيل %', 'فوترة الشهر', 'تحصيل الشهر', 'VAT', 'امتثال %', 'FTA %',
    ], [
      pack.monthLabel, pack.healthScore, pack.gisSummary.occ, pack.snap.collectionRate || 0,
      pack.monthBilled, pack.monthCollected, pack.monthVat,
      pack.compliance?.avgScore ?? '', pack.vat?.score ?? '',
    ]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'ملخص');
    const apts = [['الشقة', 'الحالة', 'المستأجر', 'الإيجار', 'نهاية العقد'], ...(pack.snap.aptRows || []).map(r => [r.no, r.statusAr, r.tenant, r.rent, r.end])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(apts), 'الشقق');
    const inv = [['الفاتورة', 'التاريخ', 'المبلغ', 'المدفوع', 'الحالة'], ...pack.monthInvoices.map(i => [i.invoice_no, i.issue_date, i.amount, i.paid_amount, i.status])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inv), 'فواتير');
    XLSX.writeFile(wb, `owner-pack-${pack.month}.xlsx`);
    toast('تم تنزيل Excel');
  },

  exportCsv(month) {
    const pack = this.build(month);
    const lines = [
      ['section', 'key', 'value'],
      ['summary', 'month', pack.month],
      ['summary', 'health', pack.healthScore],
      ['summary', 'occupancy', pack.gisSummary.occ],
      ['summary', 'collection', pack.snap.collectionRate],
      ['summary', 'month_billed', pack.monthBilled],
      ['summary', 'month_collected', pack.monthCollected],
      ['summary', 'vat', pack.monthVat],
      ...(pack.snap.aptRows || []).map(r => ['apartment', r.no, `${r.statusAr}|${r.tenant}|${r.rent}|${r.end}`]),
    ];
    const csv = lines.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    if (typeof downloadFile === 'function') downloadFile(`owner-pack-${pack.month}.csv`, csv, 'text/csv;charset=utf-8');
  },

  render() {
    const host = document.getElementById('ownerMonthlyPackBox');
    if (!host) return;
    const monthInput = document.getElementById('ownerPackMonth');
    const month = monthInput?.value || this.monthKey(new Date());
    const pack = this.build(month);
    Jawdah.ownerMonthlyPack = pack;

    const actionCards = pack.actions.length
      ? pack.actions.map((a, i) => `
        <article class="owner-pack-action ${a.tone || ''}">
          <span class="owner-pack-rank">${i + 1}</span>
          <div><strong>${a.title}</strong><p class="mini">${a.detail}</p></div>
          <button class="ghost" onclick="showSection('${a.section || 'dashboard'}')">${typeof ic === 'function' ? ic('arrow-left') : ''} ${a.label || 'عرض'}</button>
        </article>`).join('')
      : `<div class="ecc-empty">${typeof ic === 'function' ? ic('circle-check-big', 'title-ic') : ''} لا إجراءات عاجلة — المحفظة مستقرة</div>`;

    const renewalCards = pack.renewalSoon.length
      ? pack.renewalSoon.slice(0, 6).map(r => `
        <div class="owner-pack-renewal ${r.meta?.tone || ''}">
          <b>شقة ${r.aptNo} · ${r.client?.name || '—'}</b>
          <span class="mini">ينتهي ${r.contract.end_date} · ${r.meta?.label || ''} · مقترح ${typeof money === 'function' ? money(r.recommendedRent) : r.recommendedRent}</span>
        </div>`).join('')
      : '<p class="mini">لا عقود تحتاج تجديداً خلال 90 يوماً</p>';

    host.innerHTML = `
      <div class="owner-pack-kpis">
        <div class="owner-pack-kpi health"><span>مؤشر الصحة الشامل</span><strong class="dash-count" data-percent="1" data-value="${pack.healthScore}">0%</strong></div>
        <div class="owner-pack-kpi"><span>إشغال المحفظة</span><strong class="dash-count" data-percent="1" data-value="${pack.gisSummary.occ}">0%</strong><small class="mini">${pack.gisSummary.rented}/${pack.gisSummary.total} شقة</small></div>
        <div class="owner-pack-kpi"><span>فوترة ${pack.monthLabel}</span><strong class="dash-count" data-money="1" data-value="${Math.round(pack.monthBilled)}">0</strong></div>
        <div class="owner-pack-kpi"><span>تحصيل الشهر</span><strong class="dash-count" data-money="1" data-value="${Math.round(pack.monthCollected)}">0</strong></div>
        <div class="owner-pack-kpi"><span>امتثال · FTA</span><strong>${pack.compliance?.avgScore ?? '—'}% · ${pack.vat?.score ?? '—'}%</strong></div>
      </div>
      <div class="card glass-float-panel owner-pack-toolbar">
        <label>شهر التقرير<input type="month" id="ownerPackMonth" value="${month}" onchange="OwnerMonthlyPack.render()"></label>
        <button class="gold-btn" onclick="OwnerMonthlyPack.downloadPdf(document.getElementById('ownerPackMonth').value)">${typeof ic === 'function' ? ic('file-down') : ''} PDF للمالك</button>
        <button class="ghost" onclick="OwnerMonthlyPack.exportExcel(document.getElementById('ownerPackMonth').value)">${typeof ic === 'function' ? ic('table') : ''} Excel</button>
        <button class="ghost" onclick="OwnerMonthlyPack.exportCsv(document.getElementById('ownerPackMonth').value)">CSV</button>
      </div>
      <div class="owner-pack-layout">
        <div class="card glass-float-panel">
          <h3>${typeof ic === 'function' ? ic('list-checks', 'title-ic') : ''} أهم 5 إجراءات — الشهر القادم</h3>
          <div class="owner-pack-actions">${actionCards}</div>
        </div>
        <div class="card glass-float-panel">
          <h3>${typeof ic === 'function' ? ic('git-compare', 'title-ic') : ''} خط التجديد</h3>
          <div class="owner-pack-renewals">${renewalCards}</div>
          ${pack.renewal?.totals ? `<p class="mini owner-pack-flow">تدفق 6ش: متوقع ${money(pack.renewal.totals.baseline6m)} · حذر ${money(pack.renewal.totals.pessimistic6m)}</p>` : ''}
        </div>
      </div>
      <div class="owner-pack-modules card glass-float-panel">
        <h3>${typeof ic === 'function' ? ic('layers', 'title-ic') : ''} مصادر التقرير الموحّد</h3>
        <div class="owner-pack-module-grid">
          <button class="owner-pack-mod" onclick="showSection('dashboard')">${typeof ic === 'function' ? ic('layout-dashboard') : ''}<span>مركز القرار</span><b>${pack.snap.portfolioScore}%</b></button>
          <button class="owner-pack-mod" onclick="showSection('nizwa-gis')">${typeof ic === 'function' ? ic('map-pin') : ''}<span>GIS نزوى</span><b>${pack.gisSummary.occ}%</b></button>
          <button class="owner-pack-mod" onclick="showSection('renewal-engine')">${typeof ic === 'function' ? ic('git-compare') : ''}<span>التجديد</span><b>${pack.renewalSoon.length}</b></button>
          <button class="owner-pack-mod" onclick="showSection('compliance')">${typeof ic === 'function' ? ic('shield-check') : ''}<span>الامتثال</span><b>${pack.compliance?.avgScore ?? '—'}%</b></button>
          <button class="owner-pack-mod" onclick="showSection('vat-fta')">${typeof ic === 'function' ? ic('qr-code') : ''}<span>FTA / VAT</span><b>${pack.vat?.score ?? '—'}%</b></button>
          <button class="owner-pack-mod" onclick="showSection('invoices')">${typeof ic === 'function' ? ic('receipt') : ''}<span>الفواتير</span><b>${pack.monthInvoices.length}</b></button>
        </div>
      </div>`;

    if (typeof animateDashCounts === 'function') animateDashCounts(host);
    if (typeof paintIcons === 'function') paintIcons(host);
  },
};

function renderOwnerMonthlyPack() {
  OwnerMonthlyPack.render();
}

async function downloadOwnerMonthlyPackPdf() {
  const m = document.getElementById('ownerPackMonth')?.value || OwnerMonthlyPack.monthKey(new Date());
  await OwnerMonthlyPack.downloadPdf(m);
}
