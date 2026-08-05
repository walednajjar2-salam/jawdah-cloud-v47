/* النجار والسموم — تجارة واستيراد السيارات */
const API_BASE = '/api/auto-trading';
const content = document.getElementById('content');
const drawer = document.getElementById('drawer');
const drawerContent = document.getElementById('drawerContent');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

let currentSection = 'dashboard';
let vehiclesCache = [];
let statusFilter = '';
let makeFilter = '';
let companyProfile = null;

const LOGO_URL = '/auto-trading/assets/logo-al-najjar.svg?v=at3';
const LOGO_MARK = '/auto-trading/assets/logo-mark.svg?v=at3';

function waLink(phone) {
  const p = String(phone || '').replace(/\D/g, '');
  const full = p.startsWith('968') ? p : ('968' + p);
  return `https://wa.me/${full}`;
}

function readToken() {
  try {
    const qs = new URLSearchParams(location.search || '');
    const qTok = (qs.get('token') || '').trim();
    if (qTok) {
      localStorage.setItem('jawdah_cloud_token', qTok);
      qs.delete('token');
      history.replaceState({}, '', location.pathname + (qs.toString() ? '?' + qs.toString() : ''));
      return qTok;
    }
  } catch (_) {}
  return (localStorage.getItem('jawdah_cloud_token') || '').trim();
}

function goToPlatforms(event) {
  if (event) event.preventDefault();
  const token = readToken();
  let url = '/portal-select.html?from=autotrading&t=' + Date.now();
  if (token) url += '&token=' + encodeURIComponent(token);
  location.href = url;
}
document.querySelectorAll('[data-back-platforms]').forEach((link) => {
  link.addEventListener('click', goToPlatforms);
});

const e = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money = (v) => `${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 3 })} ر.ع`;
const dmy = (v) => {
  if (!v) return '—';
  const p = String(v).slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : e(v);
};

const actionLabel = {
  vehicle_created: 'إضافة مركبة',
  vehicle_updated: 'تحديث مركبة',
  sale_created: 'تسجيل بيع',
  import_created: 'طلب استيراد',
};

const statusClass = {
  'متاحة': 'available',
  'محجوزة': 'reserved',
  'مباعة': 'sold',
  'قيد الاستيراد': 'importing',
  'صيانة': 'service',
};

async function api(url, options = {}) {
  const token = readToken();
  if (!token) { location.replace('/app.html?v=need-login'); return; }
  const opts = { ...options };
  opts.headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token,
    ...(opts.headers || {}),
  };
  if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  const res = await fetch(url.startsWith('/api/') ? url : (API_BASE + url), opts);
  const data = await res.json().catch(() => ({ ok: false, error: 'تعذر قراءة رد الخادم' }));
  if (res.status === 401) { location.replace('/app.html?v=need-login'); return; }
  if (!res.ok || data.ok === false) throw new Error(data.error || 'حدث خطأ');
  return data;
}

function toast(message, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast ${type} show`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 3100);
}

function pill(s, label = s) {
  return `<span class="pill ${statusClass[s] || 'draft'}">${e(label)}</span>`;
}

function setTitle(title, subtitle = '') {
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSubtitle').textContent = subtitle || 'النجار والسموم — تجارة واستيراد السيارات';
}

function openDrawer(html) {
  drawerContent.innerHTML = html;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
}

function openModal(html) {
  modalContent.innerHTML = html;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

document.getElementById('drawerClose').onclick = closeDrawer;
document.getElementById('modalClose').onclick = closeModal;
drawer.addEventListener('click', ev => { if (ev.target === drawer) closeDrawer(); });
modal.addEventListener('click', ev => { if (ev.target === modal) closeModal(); });
document.getElementById('refreshPage').onclick = () => loadSection(currentSection);
document.getElementById('mobileMenu').onclick = () => document.querySelector('.sidebar').classList.toggle('open');

for (const btn of document.querySelectorAll('.nav-item')) {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    document.querySelector('.sidebar').classList.remove('open');
    loadSection(btn.dataset.section);
  });
}

function stat(label, value, cls = '') {
  return `<div class="stat-card ${cls}"><span class="label">${e(label)}</span><strong>${e(value)}</strong></div>`;
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => toast('تم النسخ')).catch(() => toast('تعذر النسخ', 'error'));
}

function renderCompanyCard(c) {
  if (!c) return '';
  const bank = c.bank || {};
  const contacts = c.contacts || [];
  return `
    <div class="company-hero-wide">
      <img class="sign-banner" src="${e(c.logo_url || LOGO_URL)}" alt="${e(c.name_en || 'NAJJAR TRADING')}">
      <div>
        <h2 style="margin:0;color:var(--navy)">${e(c.name_en || 'NAJJAR TRADING')}</h2>
        <p class="mini" style="letter-spacing:1px">${e(c.tagline_en || 'USED & IMPORTED CARS')}</p>
        <p class="mini">${e(c.name_ar || '')}</p>
        <p class="mini">${e(c.address_ar || '')} · ${e(c.address_en || '')}</p>
      </div>
    </div>
    <div class="split-grid">
      <section class="card">
        <div class="card-header"><h3>📞 التواصل</h3></div>
        <div class="card-body contact-grid">
          ${contacts.map(x => `
            <div class="contact-card">
              <strong>${e(x.label_ar)}</strong>
              ${x.whatsapp ? `<span class="wa-badge">WhatsApp</span>` : ''}
              <a href="${x.whatsapp ? waLink(x.phone) : ('tel:' + e(String(x.phone).replace(/\s/g, '')))}" ${x.whatsapp ? 'target="_blank" rel="noopener"' : ''}>${e(x.note || x.phone)}</a>
            </div>`).join('')}
        </div>
      </section>
      <section class="card">
        <div class="card-header"><h3>🏦 الحساب البنكي — ${e(bank.name_ar || '')}</h3></div>
        <div class="card-body">
          <div class="detail-list">
            <div class="detail-row"><span>اسم صاحب الحساب</span><strong>${e(bank.account_name_en || '')}</strong></div>
            <div class="detail-row copy-row"><span>رقم الحساب</span><span><strong class="number">${e(bank.account_number || '')}</strong> <button type="button" class="btn secondary copy" data-copy="${e(bank.account_number || '')}">نسخ</button></span></div>
            <div class="detail-row copy-row"><span>IBAN</span><span><strong class="number">${e(bank.iban || '')}</strong> <button type="button" class="btn secondary copy" data-copy="${e(bank.iban || '')}">نسخ</button></span></div>
            <div class="detail-row copy-row"><span>SWIFT</span><span><strong class="number">${e(bank.swift || '')}</strong> <button type="button" class="btn secondary copy" data-copy="${e(bank.swift || '')}">نسخ</button></span></div>
            <div class="detail-row"><span>البنك</span><strong>${e(bank.name_ar || '')} · ${e(bank.name_en || '')}</strong></div>
          </div>
        </div>
      </section>
    </div>
    <p class="mini" style="margin-top:12px">الشعار مطابق للافتة الخارجية — NAJJAR TRADING · Nizwa · Falaj</p>`;
}

function bindCopyButtons(root) {
  (root || document).querySelectorAll('[data-copy]').forEach(btn => {
    btn.onclick = () => copyText(btn.getAttribute('data-copy') || '');
  });
}

async function ensureCompany() {
  if (companyProfile) return companyProfile;
  const data = await api('/company');
  companyProfile = data.company || {};
  return companyProfile;
}

async function loadCompany() {
  setTitle('بيانات الشركة', 'التواصل والحساب البنكي — Al Najjar Trading');
  const c = await ensureCompany();
  content.innerHTML = renderCompanyCard(c);
  bindCopyButtons(content);
}

async function loadSection(section) {
  currentSection = section;
  content.classList.add('section-updating');
  try {
    if (section === 'dashboard') return await loadDashboard();
    if (section === 'vehicles') return await loadVehicles();
    if (section === 'sales') return await loadSales();
    if (section === 'imports') return await loadImports();
    if (section === 'company') return await loadCompany();
  } catch (err) {
    content.innerHTML = `<div class="alert error">${e(err.message)}</div>`;
  } finally {
    requestAnimationFrame(() => content.classList.remove('section-updating'));
  }
}

async function loadDashboard() {
  setTitle('لوحة التحكم', 'ملخص مخزون السيارات والمبيعات والاستيراد');
  const data = await api('/dashboard');
  const c = data.company || {};
  companyProfile = c;
  const s = data.stats;
  content.innerHTML = `
    <div class="stats-grid">
      ${stat('إجمالي المركبات', s.total_vehicles)}
      ${stat('متاحة للبيع', s.available, 'highlight')}
      ${stat('محجوزة', s.reserved)}
      ${stat('مباعة', s.sold)}
      ${stat('قيد الاستيراد', s.importing)}
      ${stat('قيمة المخزون', money(s.stock_value))}
    </div>
    <div class="split-grid">
      <section class="card">
        <div class="card-header"><h3>المبيعات</h3></div>
        <div class="card-body">
          <div class="detail-list">
            <div class="detail-row"><span>عدد المبيعات</span><strong>${s.sales_count}</strong></div>
            <div class="detail-row"><span>إجمالي المبيعات</span><strong>${money(s.sales_total)}</strong></div>
            <div class="detail-row"><span>طلبات استيراد نشطة</span><strong>${s.pending_imports}</strong></div>
          </div>
        </div>
      </section>
      <section class="card">
        <div class="card-header"><h3>آخر الحركات</h3></div>
        <div class="card-body audit-list">
          ${data.recent.length ? data.recent.map(a => `
            <div class="contract-card">
              <strong>${e(actionLabel[a.action] || a.action)}</strong>
              <div class="meta">
                <span>${e(a.display_name || 'النظام')}</span>
                <span>${e(new Date(a.created_at).toLocaleString('ar-OM'))}</span>
              </div>
            </div>`).join('') : '<div class="empty-state">لا توجد حركات بعد</div>'}
        </div>
      </section>
    </div>
    <section class="card" style="margin-top:16px">
      <div class="card-header"><h3>NAJJAR TRADING — ${e(c.address_ar || 'نزوى الفلج')}</h3></div>
      <div class="card-body">
        <div class="contact-grid" style="margin-bottom:14px">
          ${(c.contacts || []).slice(0, 2).map(x => `
            <div class="contact-card">
              <strong>${e(x.label_ar)}</strong>
              <span class="wa-badge">WhatsApp</span>
              <a href="${waLink(x.phone)}" target="_blank" rel="noopener">${e(x.note || x.phone)}</a>
            </div>`).join('')}
        </div>
        <div class="detail-list">
          <div class="detail-row copy-row"><span>IBAN — ${e((c.bank || {}).name_ar || 'صحار')}</span>
            <span><strong class="number">${e((c.bank || {}).iban || '')}</strong>
            <button type="button" class="btn secondary copy" data-copy="${e((c.bank || {}).iban || '')}">نسخ</button></span>
          </div>
        </div>
        <p class="mini" style="margin-top:10px">${e(c.motto_ar || '')}</p>
      </div>
    </section>`;
  bindCopyButtons(content);
}

async function loadVehicles() {
  setTitle('مخزون السيارات', 'جميع المركبات — متاحة، محجوزة، ومباعة');
  const qs = new URLSearchParams();
  if (statusFilter) qs.set('status', statusFilter);
  if (makeFilter) qs.set('make', makeFilter);
  const data = await api('/vehicles' + (qs.toString() ? '?' + qs.toString() : ''));
  vehiclesCache = data.vehicles || [];
  const makes = data.makes || [];
  content.innerHTML = `
    <div class="page-head">
      <div><h2>مخزون السيارات</h2><p>${vehiclesCache.length} مركبة</p></div>
      <div class="actions-row">
        <button class="btn primary" type="button" id="btnAddVehicle">+ إضافة مركبة</button>
      </div>
    </div>
    <div class="filters">
      <select id="filterStatus">
        <option value="">كل الحالات</option>
        ${['متاحة', 'محجوزة', 'مباعة', 'قيد الاستيراد', 'صيانة'].map(s => `<option value="${s}" ${statusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <select id="filterMake">
        <option value="">كل الماركات</option>
        ${makes.map(m => `<option value="${e(m)}" ${makeFilter === m ? 'selected' : ''}>${e(m)}</option>`).join('')}
      </select>
      <button class="btn secondary" type="button" id="btnApplyFilter">تصفية</button>
    </div>
    <div class="vehicle-grid">
      ${vehiclesCache.length ? vehiclesCache.map(v => vehicleCard(v)).join('') : '<div class="empty-state">لا توجد مركبات — أضف مركبة جديدة</div>'}
    </div>`;
  document.getElementById('btnAddVehicle').onclick = showAddVehicleForm;
  document.getElementById('btnApplyFilter').onclick = () => {
    statusFilter = document.getElementById('filterStatus').value;
    makeFilter = document.getElementById('filterMake').value;
    loadVehicles();
  };
  content.querySelectorAll('[data-vehicle-id]').forEach(el => {
    el.onclick = () => openVehicleDetail(Number(el.dataset.vehicleId));
  });
}

function vehicleCard(v) {
  return `
    <div class="vehicle-card" data-vehicle-id="${v.id}" role="button" tabindex="0">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <h4>${e(v.make)} ${e(v.model)}</h4>
        ${pill(v.status)}
      </div>
      <p class="mini">${e(v.variant || '')} · ${e(v.year || '—')} · ${e(v.color || '')}</p>
      <p><strong>${money(v.list_price)}</strong></p>
      <p class="mini">مخزون: ${e(v.stock_no)}${v.plate_no ? ' · لوحة: ' + e(v.plate_no) : ''}</p>
    </div>`;
}

async function openVehicleDetail(id) {
  const data = await api('/vehicles/' + id);
  const v = data.vehicle;
  openDrawer(`
    <div class="drawer-title"><h2>${e(v.make)} ${e(v.model)}</h2><p>${e(v.stock_no)} · ${pill(v.status)}</p></div>
    <div class="detail-list" style="margin:16px 0">
      <div class="detail-row"><span>الطراز</span><strong>${e(v.variant || '—')}</strong></div>
      <div class="detail-row"><span>النوع</span><strong>${e(v.vehicle_type || '—')}</strong></div>
      <div class="detail-row"><span>اللون / السنة</span><strong>${e(v.color || '—')} · ${e(v.year || '—')}</strong></div>
      <div class="detail-row"><span>رقم الهيكل</span><strong class="number">${e(v.vin || '—')}</strong></div>
      <div class="detail-row"><span>رقم المحرك</span><strong class="number">${e(v.engine_no || '—')}</strong></div>
      <div class="detail-row"><span>سعر الشراء</span><strong>${money(v.purchase_cost)}</strong></div>
      <div class="detail-row"><span>سعر البيع</span><strong>${money(v.list_price)}</strong></div>
      <div class="detail-row"><span>بلد المنشأ</span><strong>${e(v.origin_country || '—')}</strong></div>
      <div class="detail-row"><span>مرجع الاستيراد</span><strong>${e(v.import_ref || '—')}</strong></div>
      <div class="detail-row"><span>اللوحة / الرخصة</span><strong>${e(v.plate_no || '—')} · ${dmy(v.license_valid_until)}</strong></div>
      <div class="detail-row"><span>التأمين</span><strong>${e(v.insurance_company || '—')}</strong></div>
      ${v.notes ? `<div class="detail-row"><span>ملاحظات</span><strong>${e(v.notes)}</strong></div>` : ''}
    </div>
    <div class="form-actions">
      ${v.status !== 'مباعة' ? `<button class="btn success" type="button" id="btnSellVehicle">تسجيل بيع</button>` : ''}
      <button class="btn secondary" type="button" id="btnEditVehicle">تعديل</button>
    </div>`);
  const sellBtn = document.getElementById('btnSellVehicle');
  if (sellBtn) sellBtn.onclick = () => showSaleForm(v);
  document.getElementById('btnEditVehicle').onclick = () => showEditVehicleForm(v);
}

function showAddVehicleForm() {
  openModal(`
    <h2>إضافة مركبة جديدة</h2>
    <div class="form-grid">
      <label class="field"><span>رقم المخزون *</span><input id="fStockNo" placeholder="AT-006"></label>
      <label class="field"><span>الماركة *</span><input id="fMake" placeholder="Toyota"></label>
      <label class="field"><span>الطراز *</span><input id="fModel" placeholder="Camry"></label>
      <label class="field"><span>الفئة</span><input id="fVariant" placeholder="LE"></label>
      <label class="field"><span>نوع المركبة</span><input id="fType" placeholder="Sedan"></label>
      <label class="field"><span>اللون</span><input id="fColor"></label>
      <label class="field"><span>سنة الصنع</span><input id="fYear" type="number" min="1990" max="2030"></label>
      <label class="field"><span>رقم الهيكل VIN</span><input id="fVin"></label>
      <label class="field"><span>سعر الشراء</span><input id="fPurchase" type="number" step="0.001"></label>
      <label class="field"><span>سعر البيع</span><input id="fList" type="number" step="0.001"></label>
      <label class="field"><span>بلد المنشأ</span><input id="fOrigin"></label>
      <label class="field full"><span>ملاحظات</span><textarea id="fNotes" rows="2"></textarea></label>
    </div>
    <div class="form-actions">
      <button class="btn primary" type="button" id="btnSaveVehicle">حفظ</button>
      <button class="btn ghost" type="button" onclick="closeModal()">إلغاء</button>
    </div>`);
  document.getElementById('btnSaveVehicle').onclick = async () => {
    try {
      await api('/vehicles', {
        method: 'POST',
        body: {
          stock_no: document.getElementById('fStockNo').value.trim(),
          make: document.getElementById('fMake').value.trim(),
          model: document.getElementById('fModel').value.trim(),
          variant: document.getElementById('fVariant').value.trim(),
          vehicle_type: document.getElementById('fType').value.trim(),
          color: document.getElementById('fColor').value.trim(),
          year: Number(document.getElementById('fYear').value) || null,
          vin: document.getElementById('fVin').value.trim(),
          purchase_cost: Number(document.getElementById('fPurchase').value) || 0,
          list_price: Number(document.getElementById('fList').value) || 0,
          origin_country: document.getElementById('fOrigin').value.trim(),
          notes: document.getElementById('fNotes').value.trim(),
        },
      });
      closeModal();
      toast('تمت إضافة المركبة');
      loadVehicles();
    } catch (err) { toast(err.message, 'error'); }
  };
}

function showEditVehicleForm(v) {
  closeDrawer();
  openModal(`
    <h2>تعديل ${e(v.make)} ${e(v.model)}</h2>
    <div class="form-grid">
      <label class="field"><span>الحالة</span>
        <select id="eStatus">${['متاحة', 'محجوزة', 'مباعة', 'قيد الاستيراد', 'صيانة'].map(s => `<option value="${s}" ${v.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      </label>
      <label class="field"><span>سعر الشراء</span><input id="ePurchase" type="number" step="0.001" value="${v.purchase_cost || 0}"></label>
      <label class="field"><span>سعر البيع</span><input id="eList" type="number" step="0.001" value="${v.list_price || 0}"></label>
      <label class="field"><span>رقم اللوحة</span><input id="ePlate" value="${e(v.plate_no || '')}"></label>
      <label class="field"><span>صلاحية الرخصة</span><input id="eLicense" type="date" value="${e(v.license_valid_until || '')}"></label>
      <label class="field"><span>شركة التأمين</span><input id="eInsurance" value="${e(v.insurance_company || '')}"></label>
      <label class="field full"><span>ملاحظات</span><textarea id="eNotes" rows="2">${e(v.notes || '')}</textarea></label>
    </div>
    <div class="form-actions">
      <button class="btn primary" type="button" id="btnUpdateVehicle">حفظ التعديل</button>
      <button class="btn ghost" type="button" onclick="closeModal()">إلغاء</button>
    </div>`);
  document.getElementById('btnUpdateVehicle').onclick = async () => {
    try {
      await api('/vehicles/' + v.id, {
        method: 'POST',
        body: {
          status: document.getElementById('eStatus').value,
          purchase_cost: Number(document.getElementById('ePurchase').value) || 0,
          list_price: Number(document.getElementById('eList').value) || 0,
          plate_no: document.getElementById('ePlate').value.trim(),
          license_valid_until: document.getElementById('eLicense').value,
          insurance_company: document.getElementById('eInsurance').value.trim(),
          notes: document.getElementById('eNotes').value.trim(),
        },
      });
      closeModal();
      toast('تم حفظ التعديل');
      loadVehicles();
    } catch (err) { toast(err.message, 'error'); }
  };
}

function showSaleForm(v) {
  closeDrawer();
  openModal(`
    <h2>تسجيل بيع — ${e(v.make)} ${e(v.model)}</h2>
    <p class="mini">مخزون: ${e(v.stock_no)} · السعر: ${money(v.list_price)}</p>
    <div class="form-grid">
      <label class="field"><span>اسم المشتري *</span><input id="sBuyer"></label>
      <label class="field"><span>الهاتف</span><input id="sPhone"></label>
      <label class="field"><span>سعر البيع</span><input id="sPrice" type="number" step="0.001" value="${v.list_price || 0}"></label>
      <label class="field"><span>العربون</span><input id="sDeposit" type="number" step="0.001" value="0"></label>
      <label class="field"><span>طريقة الدفع</span>
        <select id="sMethod"><option>نقد</option><option>تحويل بنكي</option><option>شيك</option><option>تمويل</option></select>
      </label>
      <label class="field"><span>تاريخ البيع</span><input id="sDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
      <label class="field full"><span>ملاحظات</span><textarea id="sNotes" rows="2"></textarea></label>
    </div>
    <div class="form-actions">
      <button class="btn success" type="button" id="btnConfirmSale">تأكيد البيع</button>
      <button class="btn ghost" type="button" onclick="closeModal()">إلغاء</button>
    </div>`);
  document.getElementById('btnConfirmSale').onclick = async () => {
    try {
      const res = await api('/sales', {
        method: 'POST',
        body: {
          vehicle_id: v.id,
          buyer_name: document.getElementById('sBuyer').value.trim(),
          buyer_phone: document.getElementById('sPhone').value.trim(),
          sale_price: Number(document.getElementById('sPrice').value) || 0,
          deposit_amount: Number(document.getElementById('sDeposit').value) || 0,
          payment_method: document.getElementById('sMethod').value,
          sale_date: document.getElementById('sDate').value,
          notes: document.getElementById('sNotes').value.trim(),
        },
      });
      closeModal();
      toast('تم تسجيل البيع — ' + (res.sale?.sale_no || ''));
      loadVehicles();
    } catch (err) { toast(err.message, 'error'); }
  };
}

async function loadSales() {
  setTitle('المبيعات', 'سجل مبيعات السيارات');
  const data = await api('/sales');
  const rows = data.sales || [];
  content.innerHTML = `
    <div class="page-head"><div><h2>المبيعات</h2><p>${rows.length} عملية بيع</p></div></div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>رقم البيع</th><th>المركبة</th><th>المشتري</th><th>السعر</th><th>التاريخ</th><th>الحالة</th>
        </tr></thead>
        <tbody>
          ${rows.length ? rows.map(r => `
            <tr>
              <td><b>${e(r.sale_no)}</b></td>
              <td>${e(r.make || '')} ${e(r.model || '')} <span class="mini">${e(r.stock_no)}</span></td>
              <td>${e(r.buyer_name)}<br><span class="mini">${e(r.buyer_phone || '')}</span></td>
              <td class="money">${money(r.sale_price)}</td>
              <td>${dmy(r.sale_date)}</td>
              <td>${pill(r.status)}</td>
            </tr>`).join('') : '<tr><td colspan="6" class="empty-state">لا مبيعات بعد</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

async function loadImports() {
  setTitle('الاستيراد', 'طلبات استيراد السيارات');
  const data = await api('/imports');
  const rows = data.imports || [];
  content.innerHTML = `
    <div class="page-head">
      <div><h2>طلبات الاستيراد</h2><p>${rows.length} طلب</p></div>
      <div class="actions-row">
        <button class="btn primary" type="button" id="btnAddImport">+ طلب استيراد</button>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>رقم الطلب</th><th>بلد المنشأ</th><th>المورد</th><th>عدد المركبات</th><th>التكلفة</th><th>الحالة</th><th>ETA</th>
        </tr></thead>
        <tbody>
          ${rows.length ? rows.map(r => `
            <tr>
              <td><b>${e(r.order_no)}</b></td>
              <td>${e(r.origin_country)}</td>
              <td>${e(r.supplier || '—')}</td>
              <td>${e(r.vehicle_count)}</td>
              <td class="money">${money(r.total_cost)}</td>
              <td>${pill(r.status, r.status)}</td>
              <td>${dmy(r.eta_date)}</td>
            </tr>`).join('') : '<tr><td colspan="7" class="empty-state">لا طلبات استيراد — أضف طلباً جديداً</td></tr>'}
        </tbody>
      </table>
    </div>`;
  document.getElementById('btnAddImport').onclick = showAddImportForm;
}

function showAddImportForm() {
  openModal(`
    <h2>طلب استيراد جديد</h2>
    <div class="form-grid">
      <label class="field"><span>بلد المنشأ *</span><input id="iOrigin" placeholder="اليابان"></label>
      <label class="field"><span>المورد</span><input id="iSupplier"></label>
      <label class="field"><span>عدد المركبات</span><input id="iCount" type="number" min="1" value="1"></label>
      <label class="field"><span>التكلفة الإجمالية</span><input id="iCost" type="number" step="0.001"></label>
      <label class="field"><span>تاريخ الوصول المتوقع</span><input id="iEta" type="date"></label>
      <label class="field full"><span>ملاحظات</span><textarea id="iNotes" rows="2"></textarea></label>
    </div>
    <div class="form-actions">
      <button class="btn primary" type="button" id="btnSaveImport">حفظ الطلب</button>
      <button class="btn ghost" type="button" onclick="closeModal()">إلغاء</button>
    </div>`);
  document.getElementById('btnSaveImport').onclick = async () => {
    try {
      const res = await api('/imports', {
        method: 'POST',
        body: {
          origin_country: document.getElementById('iOrigin').value.trim(),
          supplier: document.getElementById('iSupplier').value.trim(),
          vehicle_count: Number(document.getElementById('iCount').value) || 1,
          total_cost: Number(document.getElementById('iCost').value) || 0,
          eta_date: document.getElementById('iEta').value,
          notes: document.getElementById('iNotes').value.trim(),
        },
      });
      closeModal();
      toast('تم إنشاء طلب الاستيراد — ' + (res.import?.order_no || ''));
      loadImports();
    } catch (err) { toast(err.message, 'error'); }
  };
}

async function boot() {
  const token = readToken();
  if (!token) { location.replace('/app.html?v=need-login'); return; }
  try {
    const me = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json());
    const user = me.user || me;
    document.getElementById('userChip').textContent = user.name || user.username || '—';
    window.APP_USER = user;
  } catch (_) {}
  loadSection('dashboard');
}

boot();
