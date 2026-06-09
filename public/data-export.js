/* Unified Excel / PDF / CSV export for all data tables */
window.DataExport = {
  TABLE_TITLES: {
    properties: 'العقارات',
    clients: 'العملاء',
    contracts: 'العقود',
    invoices: 'الفواتير',
    payments: 'المدفوعات',
    accounts: 'الحسابات',
    purchase_invoices: 'فواتير المشتريات',
    revenues: 'الإيرادات',
    salaries: 'الرواتب',
    employees: 'الموظفون',
    admin_expenses: 'المصاريف الإدارية',
    inventory_items: 'أصناف المخزن',
    inventory_transactions: 'حركات المخزن',
    bank_transactions: 'كشف البنك',
    chart_accounts: 'دليل الحسابات',
    bank_reconciliations: 'تسوية البنك',
    financial_periods: 'الفترات المالية',
    maintenance: 'الصيانة',
    approvals: 'الموافقات',
    audit_log: 'سجل التدقيق',
    users: 'المستخدمون',
    apartments: 'إدارة الشقق — نزوى حي التراث',
    reports: 'التقارير المالية التنفيذية',
    statements: 'القوائم المالية',
    payment_proofs: 'إثباتات التحويل',
  },

  ALL_TABLES: [
    'properties', 'clients', 'contracts', 'invoices', 'payments', 'accounts',
    'purchase_invoices', 'revenues', 'salaries', 'employees', 'admin_expenses',
    'inventory_items', 'inventory_transactions', 'bank_transactions',
    'chart_accounts', 'bank_reconciliations', 'financial_periods',
    'maintenance', 'approvals', 'audit_log',
  ],

  COL_AR: {
    id: 'المعرف', name: 'الاسم', type: 'النوع', status: 'الحالة', price: 'السعر',
    location: 'الموقع', image: 'الرمز', last_update: 'آخر تحديث', notes: 'ملاحظات',
    phone: 'الهاتف', email: 'البريد', national_id: 'الهوية/السجل', balance: 'الرصيد',
    contract_no: 'رقم العقد', contract_type: 'نوع العقد', property_id: 'العقار',
    client_id: 'العميل', tenant_nationality: 'جنسية المستأجر', tenant_id_no: 'رقم الهوية',
    unit_details: 'تفاصيل الوحدة', start_date: 'تاريخ البداية', end_date: 'تاريخ النهاية',
    rent_amount: 'الإيجار', deposit_amount: 'التأمين', late_fee: 'غرامة التأخير',
    grace_days: 'مهلة السداد', renewal_notice_days: 'تنبيه التجديد', payment_cycle: 'دورة الدفع',
    legal_terms: 'الشروط القانونية', company_signatory: 'المفوض', approved_at: 'تاريخ الاعتماد',
    invoice_no: 'رقم الفاتورة', contract_id: 'العقد', issue_date: 'تاريخ الإصدار',
    due_date: 'تاريخ الاستحقاق', description: 'الوصف', amount: 'المبلغ', paid_amount: 'المدفوع',
    payment_date: 'تاريخ الدفع', method: 'طريقة الدفع', note: 'ملاحظة',
    entry_date: 'التاريخ', category: 'التصنيف', invoice_id: 'الفاتورة',
    purchase_no: 'رقم المشتريات', supplier: 'المورد', invoice_date: 'تاريخ الفاتورة',
    account_id: 'الحساب', revenue_no: 'رقم الإيراد', revenue_date: 'تاريخ الإيراد', source: 'المصدر',
    employee_name: 'اسم الموظف', employee_id: 'معرف الموظف', nationality_category: 'الفئة',
    id_number: 'رقم الهوية', job_title: 'المسمى', department: 'القسم', salary_month: 'الشهر',
    basic_salary: 'الأساسي', allowances: 'البدلات', deductions: 'الاستقطاعات',
    net_salary: 'الصافي', employee_code: 'رمز الموظف', nationality: 'الجنسية',
    hire_date: 'تاريخ التعيين', expense_date: 'تاريخ المصروف',
    sku: 'SKU', unit: 'الوحدة', quantity: 'الكمية', min_quantity: 'الحد الأدنى',
    unit_cost: 'تكلفة الوحدة', item_id: 'الصنف', tx_date: 'تاريخ الحركة', tx_type: 'نوع الحركة',
    reference: 'المرجع', bank_date: 'تاريخ البنك', bank_name: 'البنك', matched_account_id: 'مطابقة',
    code: 'الرمز', parent_code: 'الحساب الأب', active: 'نشط',
    period_name: 'الفترة', closed_by: 'أغلق بواسطة', closed_at: 'تاريخ الإغلاق',
    entity: 'الكيان', entity_id: 'معرف الكيان', request_type: 'نوع الطلب',
    requested_by: 'طلب بواسطة', approved_by: 'اعتمد بواسطة', requested_at: 'تاريخ الطلب',
    approved_at: 'تاريخ الاعتماد', book_balance: 'رصيد الدفاتر', bank_balance: 'رصيد البنك',
    difference: 'الفرق', reconciled_by: 'سوّى بواسطة', reconciled_at: 'تاريخ التسوية',
    property_id_maint: 'العقار', title: 'العنوان', priority: 'الأولوية', request_date: 'تاريخ الطلب',
    cost: 'التكلفة', username: 'المستخدم', role: 'الدور', created_at: 'تاريخ الإنشاء',
    last_login: 'آخر دخول', action: 'الإجراء', details: 'التفاصيل', created_at_audit: 'الوقت',
    no: 'رقم الشقة', statusAr: 'حالة الشقة', unitType: 'نوع الوحدة', rooms: 'الغرف',
    tenant: 'المستأجر', avgRent: 'متوسط الإيجار', rent: 'الإيجار', start: 'بداية العقد', end: 'نهاية العقد',
    shortContract: 'عقد قصير', contractDaysLeft: 'أيام متبقية',
    metric: 'المؤشر', value: 'القيمة', section: 'القسم', item: 'البند', amount: 'المبلغ',
  },

  toolbar(table) {
    const t = this.escapeAttr(table);
    return `<div class="export-toolbar" data-export="${t}">
      <button type="button" class="ghost export-btn export-xlsx" onclick="DataExport.table('${t}','xlsx')" title="تصدير Excel"><i data-lucide="file-spreadsheet" class="lucide-icon"></i> Excel</button>
      <button type="button" class="ghost export-btn export-pdf" onclick="DataExport.table('${t}','pdf')" title="تصدير PDF"><i data-lucide="file-text" class="lucide-icon"></i> PDF</button>
      <button type="button" class="ghost export-btn export-csv" onclick="DataExport.table('${t}','csv')" title="تصدير CSV"><i data-lucide="download" class="lucide-icon"></i> CSV</button>
    </div>`;
  },

  escapeAttr(s) {
    return String(s || '').replace(/'/g, "\\'");
  },

  todayStamp() {
    return new Date().toISOString().slice(0, 10);
  },

  fileBase(table) {
    return `jawdah-${table}-${this.todayStamp()}`;
  },

  title(table) {
    return this.TABLE_TITLES[table] || table;
  },

  sheetName(table) {
    const map = {
      properties: 'Properties', clients: 'Clients', contracts: 'Contracts',
      invoices: 'Invoices', payments: 'Payments', accounts: 'Accounts',
      purchase_invoices: 'Purchases', revenues: 'Revenues', salaries: 'Salaries',
      employees: 'Employees', admin_expenses: 'AdminExp', inventory_items: 'Inventory',
      inventory_transactions: 'InvTx', bank_transactions: 'Bank', chart_accounts: 'COA',
      bank_reconciliations: 'Reconcile', financial_periods: 'Periods',
      maintenance: 'Maintenance', approvals: 'Approvals', audit_log: 'Audit',
      users: 'Users', apartments: 'Apartments', reports: 'Reports', statements: 'Statements',
    };
    return (map[table] || table).slice(0, 31);
  },

  lookup(table, id) {
    if (!id || !window.Jawdah?.data) return id || '';
    const row = (Jawdah.data[table] || []).find(x => x.id === id);
    if (!row) return id;
    return row.name || row.contract_no || row.invoice_no || row.username || id;
  },

  enrichRow(table, row) {
    const r = { ...row };
    const linkFields = [
      ['property_id', 'properties'], ['client_id', 'clients'], ['contract_id', 'contracts'],
      ['invoice_id', 'invoices'], ['employee_id', 'employees'], ['item_id', 'inventory_items'],
      ['account_id', 'chart_accounts'], ['matched_account_id', 'chart_accounts'],
    ];
    linkFields.forEach(([field, ref]) => {
      if (r[field]) r[field] = this.lookup(ref, r[field]);
    });
    if (table === 'maintenance' && r.property_id) {
      r.property_id = this.lookup('properties', row.property_id);
    }
    if (table === 'inventory_transactions' && row.item_id) {
      r.item_id = this.lookup('inventory_items', row.item_id);
    }
    return r;
  },

  apartmentRows() {
    if (typeof collectApartmentRows !== 'function') return [];
    return collectApartmentRows().map(r => ({
      no: r.no,
      statusAr: r.shortContract ? 'عقد قصير' : r.statusAr,
      unitType: r.unitType,
      rooms: r.rooms,
      tenant: r.tenant,
      phone: r.phone,
      avgRent: r.avgRent,
      rent: r.rent,
      start: r.start,
      end: r.end,
      shortContract: r.shortContract ? 'نعم' : 'لا',
      contractDaysLeft: r.contractDaysLeft ?? '',
    }));
  },

  reportsRows() {
    const k = Jawdah?.dashboard?.kpis || {};
    return [
      { metric: 'الإيرادات', value: k.income ?? 0 },
      { metric: 'المصروفات', value: k.expense ?? 0 },
      { metric: 'الصافي', value: k.net ?? 0 },
      { metric: 'المتأخرات', value: k.overdue ?? 0 },
      { metric: 'الإشغال %', value: k.occupancy ?? 0 },
      { metric: 'الفوترة', value: k.billed ?? 0 },
      { metric: 'التحصيل', value: k.paid ?? 0 },
      { metric: 'جودة البيانات %', value: k.health ?? 0 },
    ];
  },

  statementsRows() {
    const s = Jawdah?.lastStatements;
    if (!s) return [{ section: '—', item: 'قم بتوليد القوائم المالية أولاً', amount: '' }];
    const is = s.income_statement || {};
    const bs = s.balance_sheet || {};
    const a = bs.assets || {};
    const l = bs.liabilities || {};
    const eq = bs.equity || {};
    return [
      { section: 'قائمة الدخل', item: 'الإيرادات', amount: is.revenue },
      { section: 'قائمة الدخل', item: 'المصروفات', amount: is.expenses },
      { section: 'قائمة الدخل', item: 'الرواتب', amount: is.payroll },
      { section: 'قائمة الدخل', item: 'إدارية وعمومية', amount: is.general_admin },
      { section: 'قائمة الدخل', item: 'صافي الدخل', amount: is.net_income },
      { section: 'الميزانية', item: 'البنك', amount: a.cash_bank },
      { section: 'الميزانية', item: 'الذمم المدينة', amount: a.accounts_receivable },
      { section: 'الميزانية', item: 'المخزون', amount: a.inventory },
      { section: 'الميزانية', item: 'الذمم الدائنة', amount: l.accounts_payable },
      { section: 'الميزانية', item: 'الأرباح المحتجزة', amount: eq.retained_earnings },
    ];
  },

  getRows(table) {
    if (table === 'apartments') return this.apartmentRows();
    if (table === 'reports') return this.reportsRows();
    if (table === 'statements') return this.statementsRows();
    const raw = [...(Jawdah?.data?.[table] || [])];
    return raw.map(r => this.enrichRow(table, r));
  },

  accessibleTables() {
    const list = [...this.ALL_TABLES];
    if (Jawdah?.data?.users) list.push('users');
    list.push('apartments', 'reports');
    if (Jawdah?.lastStatements) list.push('statements');
    return list.filter(t => {
      if (t === 'users' || t === 'audit_log') return Jawdah?.user?.role === 'admin';
      if (t === 'apartments') return true;
      return (Jawdah?.data?.[t] || []).length >= 0;
    });
  },

  headerLabel(key) {
    return this.COL_AR[key] || key;
  },

  async table(table, format) {
    try {
      if (format === 'csv') return this.downloadCsv(table);
      if (format === 'xlsx') return this.downloadExcel(table);
      if (format === 'pdf') return this.downloadPdf(table);
      throw new Error('صيغة غير مدعومة');
    } catch (e) {
      toast(e.message || 'تعذر التصدير', true);
    }
  },

  async downloadCsv(table, silent) {
    if (!silent) toast('جاري تصدير CSV...');
    const res = await fetch('/api/export/' + encodeURIComponent(table === 'apartments' ? 'properties' : table), {
      headers: { Authorization: 'Bearer ' + (Jawdah?.token || '') },
    });
    if (table === 'apartments') {
      const rows = this.apartmentRows();
      const cols = Object.keys(rows[0] || { no: '' });
      const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = '\ufeff' + [cols.map(c => this.headerLabel(c)).join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
      this.saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), this.fileBase('apartments') + '.csv');
      if (!silent) toast('تم تنزيل CSV');
      return;
    }
    if (table === 'reports' || table === 'statements') {
      const rows = table === 'reports' ? this.reportsRows() : this.statementsRows();
      const keys = Object.keys(rows[0] || {});
      const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = '\ufeff' + [keys.map(k => this.headerLabel(k)).join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n');
      this.saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), this.fileBase(table) + '.csv');
      if (!silent) toast('تم تنزيل CSV');
      return;
    }
    if (!res.ok) throw new Error('فشل التصدير');
    const blob = await res.blob();
    this.saveBlob(blob, this.fileBase(table) + '.csv');
    if (!silent) toast('تم تنزيل CSV');
  },

  rowsToAoA(rows) {
    if (!rows.length) return [['—'], ['لا توجد بيانات']];
    const keys = Object.keys(rows[0]);
    return [
      keys.map(k => this.headerLabel(k)),
      ...rows.map(r => keys.map(k => r[k] ?? '')),
    ];
  },

  async downloadExcel(table) {
    if (!window.XLSX) throw new Error('مكتبة Excel غير محمّلة');
    toast('جاري تجهيز Excel...');
    const rows = this.getRows(table);
    const aoa = this.rowsToAoA(rows);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.sheetName(table));
    XLSX.writeFile(wb, this.fileBase(table) + '.xlsx');
    toast('تم تنزيل Excel');
  },

  tableHtmlDoc(title, rows) {
    const s = CompanyProfile?.settings || {};
    const esc = CompanyProfile?.escapeHtml?.bind(CompanyProfile) || (x => String(x ?? ''));
    const logo = CompanyProfile?.logoUrl?.() || 'assets/logo-primary.png';
    if (!rows.length) {
      return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
        body{font-family:Tajawal,Arial,sans-serif;margin:0;padding:24px;background:#fdfbf7;color:#1a1a1a}
        .qls-doc{max-width:900px;margin:0 auto} h1{font-size:22px} .meta{color:#555;font-size:13px}
      </style></head><body><article class="qls-doc"><img src="${esc(logo)}" alt="logo" style="height:52px">
      <h1>${esc(title)}</h1><div class="meta">${esc(new Date().toLocaleString('ar-OM'))}</div><p>لا توجد بيانات للتصدير.</p></article></body></html>`;
    }
    const keys = Object.keys(rows[0]);
    const head = keys.map(k => `<th>${esc(this.headerLabel(k))}</th>`).join('');
    const body = rows.map(r => `<tr>${keys.map(k => `<td>${esc(r[k])}</td>`).join('')}</tr>`).join('');
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
      body{font-family:Tajawal,Arial,sans-serif;margin:0;padding:24px;background:#fdfbf7;color:#1a1a1a}
      .qls-doc{max-width:920px;margin:0 auto}
      h1{margin:0 0 6px;font-size:22px;color:#92400e}
      .meta{color:#555;font-size:13px;margin-bottom:18px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
      th,td{border:1px solid #ddd;padding:7px 8px;text-align:right;vertical-align:top}
      th{background:#f5efe6;font-weight:700}
      tr:nth-child(even){background:#faf8f4}
      footer{margin-top:20px;font-size:11px;color:#666;border-top:1px solid #ddd;padding-top:10px}
    </style></head><body><article class="qls-doc">
      <img src="${esc(logo)}" alt="logo" style="height:52px">
      <h1>${esc(title)}</h1>
      <div class="meta">${esc(s.name_ar || '')} · ${esc(new Date().toLocaleString('ar-OM'))} · ${rows.length} سجل</div>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <footer>${esc(s.name_en || '')} · CR ${esc(s.cr_no || '')}</footer>
    </article></body></html>`;
  },

  async downloadPdf(table) {
    if (typeof downloadHtmlAsPdf !== 'function') throw new Error('PDF library not loaded');
    const rows = this.getRows(table);
    await downloadHtmlAsPdf(this.tableHtmlDoc(this.title(table), rows), this.fileBase(table) + '.pdf');
  },

  multiTableHtmlDoc(sections) {
    const s = CompanyProfile?.settings || {};
    const esc = CompanyProfile?.escapeHtml?.bind(CompanyProfile) || (x => String(x ?? ''));
    const logo = CompanyProfile?.logoUrl?.() || 'assets/logo-primary.png';
    const parts = sections.map(({ title, rows }) => {
      if (!rows.length) return `<section><h2>${esc(title)}</h2><p class="empty">لا توجد بيانات</p></section>`;
      const keys = Object.keys(rows[0]);
      const head = keys.map(k => `<th>${esc(this.headerLabel(k))}</th>`).join('');
      const body = rows.map(r => `<tr>${keys.map(k => `<td>${esc(r[k])}</td>`).join('')}</tr>`).join('');
      return `<section><h2>${esc(title)} (${rows.length})</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></section>`;
    }).join('');
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
      body{font-family:Tajawal,Arial,sans-serif;margin:0;padding:24px;background:#fdfbf7;color:#1a1a1a}
      .qls-doc{max-width:920px;margin:0 auto}
      h1{font-size:24px;color:#92400e;margin:0 0 8px}
      h2{font-size:16px;color:#78350f;margin:28px 0 10px;page-break-after:avoid}
      .meta{color:#555;font-size:13px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;page-break-inside:auto}
      th,td{border:1px solid #ddd;padding:6px;text-align:right}
      th{background:#f5efe6}
      tr{page-break-inside:avoid}
      section{page-break-inside:avoid;margin-bottom:16px}
      .empty{color:#888;font-size:13px}
      footer{margin-top:24px;font-size:11px;color:#666;border-top:1px solid #ddd;padding-top:10px}
    </style></head><body><article class="qls-doc">
      <img src="${esc(logo)}" alt="logo" style="height:52px">
      <h1>تصدير شامل — ${esc(s.name_ar || 'جودة الانطلاقة')}</h1>
      <div class="meta">${esc(new Date().toLocaleString('ar-OM'))} · ${sections.length} جدول</div>
      ${parts}
      <footer>${esc(s.name_en || '')} · CR ${esc(s.cr_no || '')}</footer>
    </article></body></html>`;
  },

  async exportAll(format) {
    const tables = this.accessibleTables();
    if (format === 'xlsx') {
      if (!window.XLSX) throw new Error('مكتبة Excel غير محمّلة');
      toast('جاري تجهيز Excel شامل...');
      const wb = XLSX.utils.book_new();
      tables.forEach(t => {
        const rows = this.getRows(t);
        const ws = XLSX.utils.aoa_to_sheet(this.rowsToAoA(rows));
        XLSX.utils.book_append_sheet(wb, ws, this.sheetName(t));
      });
      XLSX.writeFile(wb, `jawdah-full-export-${this.todayStamp()}.xlsx`);
      toast('تم تنزيل Excel الشامل');
      return;
    }
    if (format === 'pdf') {
      toast('جاري تجهيز PDF شامل...');
      const sections = tables.map(t => ({ title: this.title(t), rows: this.getRows(t) }));
      await downloadHtmlAsPdf(this.multiTableHtmlDoc(sections), `jawdah-full-export-${this.todayStamp()}.pdf`);
      return;
    }
    if (format === 'csv') {
      toast('جاري تصدير CSV لجميع الجداول...');
      for (const t of tables) {
        await this.downloadCsv(t, true);
        await new Promise(r => setTimeout(r, 300));
      }
      toast('تم تنزيل ملفات CSV');
      return;
    }
    throw new Error('صيغة غير مدعومة');
  },

  saveBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  },

  mountToolbars(root) {
    (root || document).querySelectorAll('.export-slot[data-table]').forEach(el => {
      el.innerHTML = this.toolbar(el.dataset.table);
    });
    if (typeof paintIcons === 'function') paintIcons(root || document);
  },
};

function initExportToolbars() {
  DataExport.mountToolbars(document);
}

async function exportCsv(table) {
  return DataExport.table(table, 'csv');
}
