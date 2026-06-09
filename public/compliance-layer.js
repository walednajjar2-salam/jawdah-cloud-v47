/* Phase 4 — Compliance Layer: legal checklist, VAT/CR alerts, audit trail, PDF archive */
window.ComplianceLayer = {
  MANUAL_CHECKS: [
    { key: 'id_copy_received', label: 'نسخة الهوية / السجل التجاري' },
    { key: 'tenant_signed', label: 'توقيع المستأجر على العقد' },
    { key: 'deposit_collected', label: 'استلام التأمين / العربون' },
    { key: 'municipality_notice', label: 'إشعار الجهة البلدية / الترخيص' },
    { key: 'insurance_verified', label: 'التأمين / الضمان' },
  ],

  AUTO_CHECKS: [
    { key: 'tenant_id_present', label: 'رقم هوية / سجل المستأجر', eval: c => !!String(c.tenant_id_no || '').trim() },
    { key: 'tenant_nationality_present', label: 'جنسية المستأجر', eval: c => !!String(c.tenant_nationality || '').trim() },
    { key: 'legal_terms_present', label: 'الشروط القانونية', eval: c => String(c.legal_terms || '').trim().length > 80 },
    { key: 'unit_details_present', label: 'تفاصيل الوحدة', eval: c => !!String(c.unit_details || '').trim() },
    { key: 'contract_approved', label: 'اعتماد العقد', eval: c => {
      const st = String(c.status || '').toLowerCase();
      if (st.includes('draft')) return false;
      if (st.includes('active')) return !!String(c.approved_at || '').trim();
      return true;
    }},
    { key: 'deposit_defined', label: 'مبلغ التأمين محدد', eval: c => Number(c.deposit_amount || 0) > 0 },
    { key: 'renewal_notice_90', label: 'تنبيه تجديد 90 يوم', eval: c => Number(c.renewal_notice_days || 0) >= 90 },
    { key: 'contract_dates_valid', label: 'تواريخ العقد صالحة', eval: c => {
      if (!c.start_date || !c.end_date) return false;
      return new Date(c.end_date + 'T00:00:00') >= new Date(c.start_date + 'T00:00:00');
    }},
    { key: 'invoices_linked', label: 'فواتير مرتبطة', eval: (c, ctx) => {
      const st = String(c.status || '').toLowerCase();
      if (!st.includes('active')) return true;
      return (ctx.invoicesByContract.get(c.id) || []).length > 0;
    }},
  ],

  recordMap() {
    const map = new Map();
    (Jawdah?.data?.compliance_records || []).forEach(r => {
      map.set(`${r.contract_id}:${r.check_key}`, r);
    });
    return map;
  },

  manualStatus(contractId, checkKey, records) {
    const rec = records.get(`${contractId}:${checkKey}`);
    return rec?.status || 'pending';
  },

  companyAlerts(settings) {
    const s = settings || CompanyProfile?.settings || {};
    const alerts = [];
    const cr = String(s.cr_no || '').trim();
    const vatReg = String(s.vat_reg_no || '').trim();
    const vatRate = Number(s.vat_rate ?? 0.05);

    if (!cr) alerts.push({ level: 'critical', code: 'cr_missing', title: 'رقم السجل التجاري (CR)', detail: 'رقم CR غير مسجل في إعدادات المؤسسة — مطلوب للعقود والفواتير الرسمية.' });
    else alerts.push({ level: 'ok', code: 'cr_ok', title: 'السجل التجاري', detail: `CR: ${cr}` });

    if (!vatReg) alerts.push({ level: 'critical', code: 'vat_reg_missing', title: 'تسجيل VAT', detail: 'رقم تسجيل ضريبة القيمة المضافة غير مسجل — الفواتير الضريبية غير مكتملة قانونياً.' });
    else alerts.push({ level: 'ok', code: 'vat_reg_ok', title: 'تسجيل VAT', detail: `VAT Reg: ${vatReg}` });

    if (!(vatRate > 0)) alerts.push({ level: 'warn', code: 'vat_rate', title: 'نسبة VAT', detail: 'نسبة ضريبة القيمة المضافة غير مضبوطة (المتوقع 5%).' });

    const invoices = Jawdah?.data?.invoices || [];
    if (invoices.length && !vatReg) {
      alerts.push({ level: 'critical', code: 'vat_invoices', title: 'فواتير بدون VAT Reg', detail: `${invoices.length} فاتورة صادرة بينما VAT Reg فارغ.` });
    }

    const unpaidVatRisk = invoices.filter(inv => {
      const amt = Number(inv.amount || 0);
      const desc = String(inv.description || '').toLowerCase();
      return amt > 0 && !desc.includes('vat') && !desc.includes('ضريبة') && vatRate > 0;
    }).length;
    if (unpaidVatRisk > 3) {
      alerts.push({ level: 'warn', code: 'vat_desc', title: 'توثيق VAT في الفواتير', detail: `${unpaidVatRisk} فاتورة بدون ذكر VAT في الوصف — راجع صياغة الفاتورة الضريبية.` });
    }

    return alerts;
  },

  contractRows() {
    const contracts = (Jawdah?.data?.contracts || []).slice();
    const invoices = Jawdah?.data?.invoices || [];
    const invoicesByContract = new Map();
    invoices.forEach(inv => {
      if (!inv.contract_id) return;
      if (!invoicesByContract.has(inv.contract_id)) invoicesByContract.set(inv.contract_id, []);
      invoicesByContract.get(inv.contract_id).push(inv);
    });
    const records = this.recordMap();
    const ctx = { invoicesByContract, records };

    return contracts.map(c => {
      const prop = typeof byId === 'function' ? byId('properties', c.property_id) : {};
      const client = typeof byId === 'function' ? byId('clients', c.client_id) : {};
      const auto = this.AUTO_CHECKS.map(ch => ({
        key: ch.key,
        label: ch.label,
        type: 'auto',
        status: ch.eval(c, ctx) ? 'ok' : 'fail',
      }));
      const manual = this.MANUAL_CHECKS.map(ch => ({
        key: ch.key,
        label: ch.label,
        type: 'manual',
        status: this.manualStatus(c.id, ch.key, records),
      }));
      const checks = [...auto, ...manual];
      const ok = checks.filter(x => x.status === 'ok' || x.status === 'waived').length;
      const score = checks.length ? Math.round((ok / checks.length) * 100) : 0;
      const fails = checks.filter(x => x.status === 'fail' || x.status === 'pending');
      const daysLeft = typeof contractDaysLeft === 'function' ? contractDaysLeft(c.end_date) : null;
      return {
        contract: c,
        property: prop,
        client,
        checks,
        score,
        fails,
        daysLeft,
        aptNo: typeof aptNoFromProperty === 'function' ? aptNoFromProperty(prop) : '—',
      };
    }).sort((a, b) => a.score - b.score || (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
  },

  build() {
    const settings = CompanyProfile?.settings || {};
    const companyAlerts = this.companyAlerts(settings);
    const contracts = this.contractRows();
    const active = contracts.filter(r => String(r.contract.status || '').toLowerCase().includes('active'));
    const avgScore = contracts.length
      ? Math.round(contracts.reduce((s, r) => s + r.score, 0) / contracts.length)
      : 100;
    const openAlerts = companyAlerts.filter(a => a.level !== 'ok').length
      + contracts.reduce((s, r) => s + r.fails.filter(f => f.status === 'fail').length, 0);
    const atRisk = contracts.filter(r => r.score < 80 || (r.daysLeft !== null && r.daysLeft <= 90)).length;
    const auditTrail = this.auditTrail();
    const archives = (Jawdah?.data?.compliance_archives || []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

    return {
      settings,
      companyAlerts,
      contracts,
      active,
      avgScore,
      openAlerts,
      atRisk,
      auditTrail,
      archives,
    };
  },

  auditTrail(limit = 40) {
    const entities = new Set(['contracts', 'invoices', 'company_settings', 'compliance_records', 'compliance_archives', 'payment_proofs']);
    const actions = new Set(['approve', 'renew', 'compliance_check', 'compliance_archive', 'update', 'create', 'portal_proof', 'approve_proof']);
    return (Jawdah?.data?.audit_log || [])
      .filter(row => entities.has(String(row.entity || '')) || actions.has(String(row.action || '')))
      .slice(0, limit);
  },

  statusLabel(st) {
    return { ok: 'مكتمل', pending: 'معلق', fail: 'ناقص', waived: 'معفى' }[st] || st;
  },

  alertClass(level) {
    return { critical: 'critical', warn: 'partial', ok: 'paid' }[level] || '';
  },

  async toggleManual(contractId, checkKey, status) {
    try {
      await api('compliance_records', {
        method: 'POST',
        body: JSON.stringify({
          contract_id: contractId,
          check_key: checkKey,
          status,
        }),
      });
      toast('تم تحديث قائمة الامتثال');
      await loadAll();
    } catch (e) {
      toast(e.message, true);
    }
  },

  async archiveReport() {
    const report = this.build();
    const title = `تقرير امتثال — ${new Date().toLocaleDateString('ar-OM')}`;
    try {
      await api('compliance_archives', {
        method: 'POST',
        body: JSON.stringify({
          title,
          summary_score: report.avgScore,
          payload_json: {
            score: report.avgScore,
            openAlerts: report.openAlerts,
            atRisk: report.atRisk,
            companyAlerts: report.companyAlerts,
            contracts: report.contracts.map(r => ({
              contract_no: r.contract.contract_no,
              apt: r.aptNo,
              tenant: r.client?.name,
              score: r.score,
              fails: r.fails.map(f => f.label),
            })),
            archived_at: new Date().toISOString(),
          },
        }),
      });
      toast('تم أرشفة تقرير الامتثال');
      await loadAll();
      this.render();
    } catch (e) {
      toast(e.message, true);
    }
  },

  reportHtml(report) {
    const esc = CompanyProfile?.escapeHtml?.bind(CompanyProfile) || (x => String(x ?? ''));
    const s = report.settings || {};
    const alertRows = report.companyAlerts.map(a =>
      `<tr class="${a.level !== 'ok' ? 'fail' : ''}"><td>${esc(a.title)}</td><td>${esc(this.statusLabel(a.level === 'ok' ? 'ok' : a.level === 'critical' ? 'fail' : 'pending'))}</td><td>${esc(a.detail)}</td></tr>`
    ).join('');
    const contractRows = report.contracts.map(r =>
      `<tr class="${r.score < 80 ? 'fail' : ''}"><td>${esc(r.contract.contract_no || r.contract.id)}</td><td>${esc(r.aptNo)}</td><td>${esc(r.client?.name)}</td><td>${esc(r.score)}%</td><td>${esc(r.fails.map(f => f.label).join(' · ') || '—')}</td></tr>`
    ).join('') || '<tr><td colspan="5">لا عقود</td></tr>';
    const auditRows = report.auditTrail.slice(0, 25).map(row =>
      `<tr><td>${esc(row.created_at)}</td><td>${esc(row.username)}</td><td>${esc(row.action)}</td><td>${esc(row.entity)}</td><td>${esc(row.details)}</td></tr>`
    ).join('') || '<tr><td colspan="5">لا سجلات</td></tr>';

    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
      body{font-family:Tajawal,Arial,sans-serif;padding:24px;background:#fdfbf7;color:#111}
      .qls-doc{max-width:920px;margin:0 auto}
      h1{color:#92400e;margin-bottom:4px} h2{color:#78350f;margin-top:24px;font-size:18px}
      .meta{color:#666;font-size:13px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
      th,td{border:1px solid #ddd;padding:8px;text-align:right} th{background:#f5efe6}
      tr.fail{background:#fee2e2}
      .score{font-size:28px;font-weight:700;color:#059669}
    </style></head><body><article class="qls-doc">
      <h1>تقرير الامتثال القانوني والضريبي</h1>
      <p class="meta">${esc(s.name_ar)} · CR ${esc(s.cr_no || '—')} · VAT ${esc(s.vat_reg_no || '—')} · ${esc(new Date().toLocaleString('ar-OM'))}</p>
      <p class="score">مؤشر الامتثال: ${esc(report.avgScore)}%</p>
      <p>تنبيهات مفتوحة: ${esc(report.openAlerts)} · عقود معرضة للخطر: ${esc(report.atRisk)}</p>
      <h2>تنبيهات VAT / CR</h2>
      <table><thead><tr><th>البند</th><th>الحالة</th><th>التفاصيل</th></tr></thead><tbody>${alertRows}</tbody></table>
      <h2>قائمة التحقق — العقود</h2>
      <table><thead><tr><th>العقد</th><th>الشقة</th><th>المستأجر</th><th>الامتثال</th><th>نواقص</th></tr></thead><tbody>${contractRows}</tbody></table>
      <h2>سجل التدقيق (آخر 25)</h2>
      <table><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>الكيان</th><th>التفاصيل</th></tr></thead><tbody>${auditRows}</tbody></table>
    </article></body></html>`;
  },

  async downloadPdf() {
    const report = Jawdah.complianceReport || this.build();
    if (typeof downloadHtmlAsPdf !== 'function') return toast('PDF غير متاح', true);
    await downloadHtmlAsPdf(this.reportHtml(report), `compliance-${new Date().toISOString().slice(0, 10)}.pdf`);
  },

  renderContractCard(row) {
    const c = row.contract;
    const manualBtns = row.checks.filter(ch => ch.type === 'manual').map(ch => {
      const next = ch.status === 'ok' ? 'pending' : 'ok';
      const icon = ch.status === 'ok' ? 'circle-check-big' : ch.status === 'waived' ? 'circle-minus' : 'circle';
      return `<button type="button" class="compliance-check ${ch.status}" onclick="ComplianceLayer.toggleManual('${c.id}','${ch.key}','${next}')" title="اضغط للتبديل">
        ${typeof ic === 'function' ? ic(icon) : ''}<span>${ch.label}</span></button>`;
    }).join('');
    const autoList = row.checks.filter(ch => ch.type === 'auto').map(ch =>
      `<li class="${ch.status}">${typeof ic === 'function' ? ic(ch.status === 'ok' ? 'check' : 'x') : ''}<span>${ch.label}</span></li>`
    ).join('');

    return `<article class="compliance-contract-card ${row.score < 80 ? 'at-risk' : ''}">
      <header>
        <div><h3>${row.property?.name || '—'} · ${row.client?.name || '—'}</h3>
          <p class="mini">${c.contract_no || c.id} · ${c.status} · ينتهي ${c.end_date || '—'} · امتثال ${row.score}%</p></div>
        <span class="badge ${row.score >= 90 ? 'paid' : row.score >= 70 ? 'partial' : 'overdue'}">${row.score}%</span>
      </header>
      <ul class="compliance-auto-list">${autoList}</ul>
      <div class="compliance-manual-grid">${manualBtns}</div>
      <div class="compliance-contract-actions">
        <button class="ghost" onclick="showSection('contracts')">${typeof ic === 'function' ? ic('file-signature') : ''} العقد</button>
        ${String(c.status || '').toLowerCase().includes('draft') ? `<button class="gold-btn" onclick="approveContract('${c.id}')">${typeof ic === 'function' ? ic('badge-check') : ''} اعتماد</button>` : ''}
      </div>
    </article>`;
  },

  render() {
    const host = document.getElementById('complianceLayerBox');
    if (!host) return;
    const report = this.build();
    Jawdah.complianceReport = report;

    const alertCards = report.companyAlerts.map(a => `
      <div class="compliance-alert ${this.alertClass(a.level)}">
        ${typeof ic === 'function' ? ic(a.level === 'ok' ? 'shield-check' : a.level === 'critical' ? 'triangle-alert' : 'alert-circle') : ''}
        <div><strong>${a.title}</strong><p class="mini">${a.detail}</p></div>
      </div>`).join('');

    const contractCards = report.contracts.length
      ? report.contracts.map(r => this.renderContractCard(r)).join('')
      : `<div class="ecc-empty">${typeof ic === 'function' ? ic('circle-check-big', 'title-ic') : ''} لا عقود — أضف عقوداً لبدء قائمة الامتثال</div>`;

    const auditRows = report.auditTrail.length
      ? report.auditTrail.map(row => `<tr>
          <td>${row.created_at || '—'}</td>
          <td>${row.username || '—'}</td>
          <td><span class="badge">${row.action || ''}</span></td>
          <td>${row.entity || '—'}</td>
          <td class="mini">${row.details || '—'}</td>
        </tr>`).join('')
      : '<tr><td colspan="5">لا سجلات تدقيق بعد</td></tr>';

    const archiveRows = report.archives.length
      ? report.archives.map(a => `<tr>
          <td>${a.title || '—'}</td>
          <td>${typeof fmt === 'function' ? fmt(a.summary_score) : a.summary_score}%</td>
          <td>${a.created_at || '—'}</td>
          <td>${a.created_by || '—'}</td>
        </tr>`).join('')
      : '<tr><td colspan="4">لا أرشيف بعد — اضغط «أرشف التقرير»</td></tr>';

    host.innerHTML = `
      <div class="compliance-kpis">
        <div class="compliance-kpi score"><span>مؤشر الامتثال</span><strong class="dash-count" data-percent="1" data-value="${report.avgScore}">0%</strong></div>
        <div class="compliance-kpi alerts"><span>تنبيهات مفتوحة</span><strong class="dash-count" data-value="${report.openAlerts}">0</strong></div>
        <div class="compliance-kpi risk"><span>عقود معرضة للخطر</span><strong class="dash-count" data-value="${report.atRisk}">0</strong></div>
        <div class="compliance-kpi active"><span>عقود نشطة</span><strong class="dash-count" data-value="${report.active.length}">0</strong></div>
      </div>
      <div class="compliance-toolbar">
        <button class="ghost" onclick="ComplianceLayer.downloadPdf()">${typeof ic === 'function' ? ic('file-down') : ''} PDF</button>
        <button class="ghost" onclick="ComplianceLayer.archiveReport()">${typeof ic === 'function' ? ic('archive') : ''} أرشف التقرير</button>
        <button class="ghost" onclick="showSection('company-settings')">${typeof ic === 'function' ? ic('building-2') : ''} إعدادات VAT/CR</button>
      </div>
      <div class="compliance-layout">
        <div class="card glass-float-panel">
          <h3>${typeof ic === 'function' ? ic('shield-alert', 'title-ic') : ''} تنبيهات VAT / CR</h3>
          <div class="compliance-alerts">${alertCards}</div>
        </div>
        <div class="card glass-float-panel">
          <h3>${typeof ic === 'function' ? ic('history', 'title-ic') : ''} سجل التدقيق</h3>
          <p class="mini">آخر إجراءات على العقود · الفواتير · الامتثال · البوابة</p>
          <div class="table-scroll"><table class="compliance-audit-table"><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>الكيان</th><th>التفاصيل</th></tr></thead><tbody>${auditRows}</tbody></table></div>
        </div>
      </div>
      <div class="card glass-float-panel compliance-contracts-panel">
        <div class="compliance-card-head"><h3>${typeof ic === 'function' ? ic('list-checks', 'title-ic') : ''} قائمة التحقق القانونية — مربوطة بالعقود</h3>
          <span class="mini">${report.contracts.length} عقد · اضغط البنود اليدوية للتبديل (معلق ↔ مكتمل)</span></div>
        <div class="compliance-contract-grid">${contractCards}</div>
      </div>
      <div class="card glass-float-panel">
        <h3>${typeof ic === 'function' ? ic('archive', 'title-ic') : ''} أرشيف PDF / التقارير</h3>
        <div class="table-scroll"><table><thead><tr><th>العنوان</th><th>الامتثال</th><th>التاريخ</th><th>بواسطة</th></tr></thead><tbody>${archiveRows}</tbody></table></div>
      </div>`;

    if (typeof animateDashCounts === 'function') animateDashCounts(host);
    if (typeof paintIcons === 'function') paintIcons(host);
  },
};

function renderComplianceLayer() {
  ComplianceLayer.render();
}
