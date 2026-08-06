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

function vehicleWhatsAppText(v, c) {
  const co = c || companyProfile || {};
  const priceLine = Number(v.list_price) > 0 ? `السعر: ${money(v.list_price)}` : 'السعر: حسب الاتفاق';
  return [
    'NAJJAR TRADING — USED & IMPORTED CARS',
    `${v.make} ${v.model} ${v.variant || ''}`.trim(),
    v.vehicle_type ? `النوع: ${v.vehicle_type}` : '',
    `السنة: ${v.year || '—'} · اللون: ${v.color || '—'}`,
    priceLine,
    `مخزون: ${v.stock_no}`,
    v.vin ? `VIN: ${v.vin}` : '',
    v.engine_no ? `المحرك: ${v.engine_no}${v.engine_cc ? ' · ' + v.engine_cc + ' cc' : ''}` : '',
    v.first_registration ? `أول تسجيل: ${dmy(v.first_registration)}` : '',
    v.license_valid_until ? `صلاحية الرخصة: ${dmy(v.license_valid_until)}` : '',
    v.license_doc_no ? `رقم الوثيقة: ${v.license_doc_no}` : '',
    v.insurance_company ? `التأمين: ${v.insurance_type || 'شامل'} — ${v.insurance_company}` : '',
    v.insurance_policy ? `وثيقة التأمين: ${v.insurance_policy}` : '',
    co.address_ar || 'نزوى — الفلج',
    'للاستفسار: +968 71924089 · +968 93391994',
  ].filter(Boolean).join('\n');
}

function vehicleDocLink(v) {
  if (!v.license_source) return '';
  const href = String(v.license_source).startsWith('/') ? v.license_source : '/' + v.license_source;
  const label = href.includes('bill-of-sale') ? 'عرض Bill of Sale'
    : href.includes('port-shipment') ? 'عرض بيانات الشحن'
    : href.includes('license') ? 'عرض رخصة المركبة'
    : 'عرض الوثيقة';
  return `<a class="btn secondary" href="${e(href)}" target="_blank" rel="noopener" style="margin-top:12px;display:inline-block">${label}</a>`;
}

function licenseDetailRows(v) {
  return `
    <div class="detail-row"><span>سعة المحرك</span><strong>${e(v.engine_cc ? v.engine_cc + ' cc' : '—')}</strong></div>
    <div class="detail-row"><span>المقاعد / المحاور</span><strong>${e(v.seats || '—')} · ${e(v.axles || '—')}</strong></div>
    <div class="detail-row"><span>أول تسجيل</span><strong>${dmy(v.first_registration)}</strong></div>
    <div class="detail-row"><span>صلاحية الرخصة</span><strong>${dmy(v.license_valid_until)}</strong></div>
    <div class="detail-row"><span>رقم الوثيقة</span><strong class="number">${e(v.license_doc_no || '—')}</strong></div>
    <div class="detail-row"><span>نوع التأمين</span><strong>${e(v.insurance_type || '—')}</strong></div>
    <div class="detail-row"><span>شركة التأمين</span><strong>${e(v.insurance_company || '—')}</strong></div>
    <div class="detail-row"><span>وثيقة التأمين</span><strong class="number">${e(v.insurance_policy || '—')}</strong></div>
    <div class="detail-row"><span>الرهن</span><strong>${e(v.mortgage || '—')}</strong></div>`;
}

function openPrintWindow(title, bodyHtml) {
  const w = window.open('', '_blank');
  if (!w) { toast('فعّل النوافذ المنبثقة للطباعة', 'error'); return; }
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${e(title)}</title>
    <style>
      body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#111}
      .head{text-align:center;border-bottom:3px solid #d4af37;padding-bottom:14px;margin-bottom:18px}
      .head h1{margin:0;color:#111;letter-spacing:2px}
      .head p{margin:6px 0 0;color:#666;font-size:13px}
      table{width:100%;border-collapse:collapse;margin:14px 0}
      th,td{border:1px solid #ddd;padding:8px;text-align:right;font-size:13px}
      th{background:#f7f7f7}
      .bank{margin-top:18px;padding:12px;border:1px solid #d4af37;border-radius:8px;background:#fffaf0}
      .foot{margin-top:24px;font-size:12px;color:#666;text-align:center}
      @media print{body{padding:0}}
    </style></head><body>${bodyHtml}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

async function printVehicleOffer(v) {
  const c = await ensureCompany();
  const bank = c.bank || {};
  const priceCell = Number(v.list_price) > 0 ? `<b>${money(v.list_price)}</b>` : 'حسب الاتفاق';
  openPrintWindow('عرض سيارة — NAJJAR TRADING', `
    <div class="head">
      <h1>NAJJAR TRADING</h1>
      <p>USED & IMPORTED CARS · ${e(c.address_ar || '')}</p>
      <p>${e(c.address_en || '')}</p>
    </div>
    <h2>عرض مركبة — ${e(v.stock_no)}</h2>
    <table>
      <tr><th>الماركة / الطراز</th><td>${e(v.make)} ${e(v.model)} ${e(v.variant || '')}</td></tr>
      <tr><th>السنة / اللون</th><td>${e(v.year || '—')} · ${e(v.color || '—')}</td></tr>
      <tr><th>النوع</th><td>${e(v.vehicle_type || '—')}</td></tr>
      <tr><th>رقم الهيكل</th><td dir="ltr">${e(v.vin || '—')}</td></tr>
      <tr><th>رقم المحرك</th><td dir="ltr">${e(v.engine_no || '—')}${v.engine_cc ? ' · ' + e(v.engine_cc) + ' cc' : ''}</td></tr>
      <tr><th>المقاعد / المحاور</th><td>${e(v.seats || '—')} · ${e(v.axles || '—')}</td></tr>
      <tr><th>بلد المنشأ</th><td>${e(v.origin_country || '—')}</td></tr>
      <tr><th>سعر البيع</th><td>${priceCell}</td></tr>
    </table>
    <h3 style="margin-top:18px">بيانات الرخصة والتأمين</h3>
    <table>
      <tr><th>أول تسجيل</th><td>${dmy(v.first_registration)}</td></tr>
      <tr><th>صلاحية الرخصة</th><td>${dmy(v.license_valid_until)}</td></tr>
      <tr><th>رقم الوثيقة</th><td dir="ltr">${e(v.license_doc_no || '—')}</td></tr>
      <tr><th>اللوحة</th><td>${e(v.plate_no || '—')}</td></tr>
      <tr><th>التأمين</th><td>${e(v.insurance_type || '—')} — ${e(v.insurance_company || '—')}</td></tr>
      <tr><th>وثيقة التأمين</th><td dir="ltr">${e(v.insurance_policy || '—')}</td></tr>
      <tr><th>الرهن</th><td>${e(v.mortgage || '—')}</td></tr>
    </table>
    <div class="bank">
      <b>للتحويل البنكي — ${e(bank.name_ar || '')}</b><br>
      ${e(bank.account_name_en || '')}<br>
      IBAN: <span dir="ltr">${e(bank.iban || '')}</span><br>
      SWIFT: <span dir="ltr">${e(bank.swift || '')}</span>
    </div>
    <p>واتساب: +968 71924089 · +968 93391994</p>
    <div class="foot">NAJJAR TRADING · Nizwa · Falaj · ${e(v.license_source ? 'بيانات الرخصة: ' + v.license_source : '')}</div>`);
}

function printSaleReceipt(sale, c) {
  const bank = (c || {}).bank || {};
  openPrintWindow('إيصال بيع — ' + (sale.sale_no || ''), `
    <div class="head">
      <h1>NAJJAR TRADING</h1>
      <p>USED & IMPORTED CARS</p>
    </div>
    <h2>إيصال بيع — ${e(sale.sale_no || '')}</h2>
    <table>
      <tr><th>التاريخ</th><td>${dmy(sale.sale_date)}</td></tr>
      <tr><th>المشتري</th><td>${e(sale.buyer_name)} ${sale.buyer_phone ? '· ' + e(sale.buyer_phone) : ''}</td></tr>
      <tr><th>المركبة</th><td>${e(sale.make || '')} ${e(sale.model || '')} · ${e(sale.stock_no || '')}</td></tr>
      <tr><th>سعر البيع</th><td><b>${money(sale.sale_price)}</b></td></tr>
      <tr><th>العربون</th><td>${money(sale.deposit_amount || 0)}</td></tr>
      <tr><th>طريقة الدفع</th><td>${e(sale.payment_method || '—')}</td></tr>
    </table>
    <div class="bank">
      <b>حساب التحويل</b><br>
      ${e(bank.account_name_en || 'Al Najjar Trading')}<br>
      IBAN: <span dir="ltr">${e(bank.iban || '')}</span>
    </div>
    <div class="foot">${e((c || {}).address_ar || 'نزوى — الفلج')}</div>`);
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

const PLATFORM_LABELS = {
  america: '🇺🇸 أمريكا — مزادات Copart / IAAI',
  salam: '🚗 سلام أوتو كار',
  oman: '🇴🇲 عُمان — مخزون السيارات',
  dubai: '🇦🇪 دبي',
  jordan: '🇯🇴 الأردن',
  iran: '🇮🇷 إيران',
  india: '🇮🇳 الهند',
  saudi: '🇸🇦 السعودية',
};

function currentPlatform() {
  try {
    const qs = new URLSearchParams(location.search || '');
    return (qs.get('platform') || localStorage.getItem('najjar_platform') || 'oman').trim();
  } catch (_) {
    return 'oman';
  }
}

function goToPlatforms(event) {
  if (event) event.preventDefault();
  const token = readToken();
  let url = '/auto-trading/platforms.html?from=dashboard&t=' + Date.now();
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
  if (!token) { location.replace('/auto-trading/login.html'); return; }
  const opts = { ...options };
  opts.headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token,
    ...(opts.headers || {}),
  };
  if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  const res = await fetch(url.startsWith('/api/') ? url : (API_BASE + url), opts);
  const data = await res.json().catch(() => ({ ok: false, error: 'تعذر قراءة رد الخادم' }));
  if (res.status === 401) { location.replace('/auto-trading/login.html'); return; }
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
    if (section === 'staff') return await loadStaff();
    if (section === 'company') return await loadCompany();
  } catch (err) {
    content.innerHTML = `<div class="alert error">${e(err.message)}</div>`;
  } finally {
    requestAnimationFrame(() => content.classList.remove('section-updating'));
  }
}

async function loadStaff() {
  setTitle('الموظفون', 'فريق NAJJAR TRADING — صلاحيات الدخول');
  const c = await ensureCompany();
  const staff = c.staff || [];
  content.innerHTML = `
    <div class="nt-dash-banner">
      <img src="${e(c.logo_mark_url || LOGO_MARK)}" alt="NAJJAR">
      <div>
        <h2>فريق العمل</h2>
        <p>ملاك · مبيعات · مستخدمون — صلاحيات المنصة</p>
      </div>
    </div>
    <div class="nt-staff-grid">
      ${staff.map(s => `
        <article class="nt-staff-card">
          <span class="nt-staff-role ${e(s.role)}">${e(s.role_ar || s.role)}</span>
          <strong>${e(s.name_ar)}</strong>
          <div class="mini">المستخدم: <span dir="ltr">${e(s.username)}</span></div>
          ${s.phone ? `<div class="mini" dir="ltr">+968 ${e(s.phone)}</div>` : ''}
        </article>`).join('')}
    </div>
    <section class="card" style="margin-top:16px">
      <div class="card-header"><h3>الصلاحيات</h3></div>
      <div class="card-body detail-list">
        <div class="detail-row"><span>مالك (Owner)</span><strong>وليد نجار · حمد السموم — كامل الصلاحيات</strong></div>
        <div class="detail-row"><span>مبيعات (Sales)</span><strong>واية الشعيلي — مخزون، مبيعات، زبائن</strong></div>
        <div class="detail-row"><span>مستخدم (User)</span><strong>رزان الشعيلي — عرض ومتابعة</strong></div>
      </div>
    </section>`;
}

async function loadDashboard() {
  setTitle('لوحة التحكم', 'داشبورد احترافي — مخزون · مبيعات · استيراد · فريق');
  const data = await api('/dashboard');
  const c = data.company || {};
  companyProfile = c;
  const s = data.stats;
  const plat = currentPlatform();
  const staff = c.staff || [];
  content.innerHTML = `
    <div class="nt-dash-banner">
      <img src="${e(c.logo_mark_url || LOGO_MARK)}" alt="NAJJAR TRADING">
      <div>
        <h2>NAJJAR TRADING</h2>
        <p>USED &amp; IMPORTED CARS · ${e(c.address_ar || 'نزوى — الفلج')}</p>
        <p class="nt-platform-chip" style="margin-top:10px">${e(PLATFORM_LABELS[plat] || plat)}</p>
      </div>
    </div>
    ${window.NajjarCar3D ? `
      <section class="card" style="margin-bottom:16px;overflow:hidden;padding:0">
        <div class="ig-media" style="position:relative;aspect-ratio:21/9;min-height:220px">
          ${window.NajjarCar3D.renderCar3D({ make: 'Mercedes-Benz', model: 'G-Class', variant: 'G63 AMG' }, { accent: 'g63', delay: 0 })}
          <div class="ig-media-badge">3D Slow Motion</div>
        </div>
        <div class="card-body" style="padding:12px 16px">
          <strong>معرض تفاعلي</strong>
          <p class="mini" style="margin:4px 0 0">سيارات ثلاثية الأبعاد بحركة بطيئة مريحة — افتح المخزون أو بوابة الزبائن</p>
        </div>
      </section>` : ''}
    <div class="stats-grid">
      ${stat('إجمالي المركبات', s.total_vehicles)}
      ${stat('متاحة للبيع', s.available, 'highlight')}
      ${stat('محجوزة', s.reserved)}
      ${stat('مباعة', s.sold)}
      ${stat('قيد الاستيراد', s.importing)}
      ${stat('قيمة المخزون', money(s.stock_value))}
    </div>
    <div class="split-grid" style="margin-top:16px">
      <section class="card">
        <div class="card-header"><h3>المبيعات والاستيراد</h3></div>
        <div class="card-body">
          <div class="detail-list">
            <div class="detail-row"><span>عدد المبيعات</span><strong>${s.sales_count}</strong></div>
            <div class="detail-row"><span>إجمالي المبيعات</span><strong>${money(s.sales_total)}</strong></div>
            <div class="detail-row"><span>طلبات استيراد نشطة</span><strong>${s.pending_imports}</strong></div>
          </div>
          <div class="actions-row" style="margin-top:14px">
            <button class="btn primary" type="button" id="dashGoVehicles">عرض المخزون</button>
            <button class="btn secondary" type="button" id="dashGoPlatforms">المنصات والدول</button>
            <a class="btn ghost" href="/auto-trading/customer.html">بوابة الزبائن</a>
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
      <div class="card-header"><h3>فريق NAJJAR TRADING</h3></div>
      <div class="card-body">
        <div class="nt-staff-grid">
          ${staff.map(x => `
            <div class="nt-staff-card">
              <span class="nt-staff-role ${e(x.role)}">${e(x.role_ar || x.role)}</span>
              <strong>${e(x.name_ar)}</strong>
              <div class="mini" dir="ltr">${e(x.username)}${x.phone ? ' · +968 ' + e(x.phone) : ''}</div>
            </div>`).join('')}
        </div>
      </div>
    </section>
    <section class="card" style="margin-top:16px">
      <div class="card-header"><h3>التواصل والحساب</h3></div>
      <div class="card-body">
        <div class="contact-grid" style="margin-bottom:14px">
          ${(c.contacts || []).slice(0, 3).map(x => `
            <div class="contact-card">
              <strong>${e(x.label_ar)}</strong>
              ${x.whatsapp ? '<span class="wa-badge">WhatsApp</span>' : ''}
              <a href="${x.whatsapp ? waLink(x.phone) : ('tel:+968' + e(String(x.phone).replace(/\D/g, '')))}" ${x.whatsapp ? 'target="_blank" rel="noopener"' : ''}>${e(x.note || x.phone)}</a>
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
  const goV = document.getElementById('dashGoVehicles');
  if (goV) goV.onclick = () => {
    document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.section === 'vehicles'));
    loadSection('vehicles');
  };
  const goP = document.getElementById('dashGoPlatforms');
  if (goP) goP.onclick = goToPlatforms;
}

let vehiclesViewMode = 'feed';

async function loadVehicles() {
  setTitle('مخزون السيارات', 'معرض 3D بطيء الحركة — ترتيب إنستغرام');
  await ensureCompany().catch(() => null);
  const qs = new URLSearchParams();
  if (statusFilter) qs.set('status', statusFilter);
  if (makeFilter) qs.set('make', makeFilter);
  const data = await api('/vehicles' + (qs.toString() ? '?' + qs.toString() : ''));
  vehiclesCache = data.vehicles || [];
  const makes = data.makes || [];
  const C3 = window.NajjarCar3D;
  content.innerHTML = `
    <div class="ig-toolbar">
      <div>
        <h2>معرض المخزون</h2>
        <p>${vehiclesCache.length} مركبة · حركة ثلاثية الأبعاد مريحة للعين</p>
      </div>
      <div class="actions-row">
        <div class="ig-view-toggle" role="group">
          <button type="button" data-vmode="feed" class="${vehiclesViewMode === 'feed' ? 'active' : ''}">فيد</button>
          <button type="button" data-vmode="grid" class="${vehiclesViewMode === 'grid' ? 'active' : ''}">شبكة</button>
        </div>
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
      <a class="btn ghost" href="/auto-trading/customer.html" target="_blank" rel="noopener">بوابة الزبائن</a>
    </div>
    <div id="vehiclesShowcase">
      ${vehiclesCache.length && C3
        ? C3.renderFeed(vehiclesCache, { stories: true, platforms: (companyProfile && companyProfile.platforms) || null })
        : (vehiclesCache.length ? `<div class="vehicle-grid">${vehiclesCache.map(v => vehicleCard(v)).join('')}</div>` : '<div class="empty-state">لا توجد مركبات — أضف مركبة جديدة</div>')}
    </div>`;
  const feed = content.querySelector('.ig-feed');
  if (feed) feed.classList.toggle('ig-feed--grid', vehiclesViewMode === 'grid');
  document.getElementById('btnAddVehicle').onclick = showAddVehicleForm;
  document.getElementById('btnApplyFilter').onclick = () => {
    statusFilter = document.getElementById('filterStatus').value;
    makeFilter = document.getElementById('filterMake').value;
    loadVehicles();
  };
  content.querySelectorAll('[data-vmode]').forEach((btn) => {
    btn.onclick = () => {
      vehiclesViewMode = btn.getAttribute('data-vmode');
      content.querySelectorAll('[data-vmode]').forEach((b) => b.classList.toggle('active', b === btn));
      const f = content.querySelector('.ig-feed');
      if (f) f.classList.toggle('ig-feed--grid', vehiclesViewMode === 'grid');
    };
  });
  content.querySelectorAll('.ig-story').forEach((btn) => {
    btn.onclick = (ev) => {
      ev.stopPropagation();
      localStorage.setItem('najjar_platform', btn.getAttribute('data-platform') || 'oman');
      goToPlatforms();
    };
  });
  content.querySelectorAll('[data-vehicle-id]').forEach((el) => {
    el.onclick = () => openVehicleDetail(Number(el.dataset.vehicleId));
    el.onkeydown = (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        openVehicleDetail(Number(el.dataset.vehicleId));
      }
    };
  });
}

function vehicleAccent(v) {
  if (window.NajjarCar3D) return window.NajjarCar3D.accentOf(v);
  if ((v.make || '').includes('Land')) return 'lr';
  if ((v.model || '').includes('GLE')) return 'gle';
  if ((v.model || '').includes('G-Class') || (v.variant || '').includes('G63')) return 'g63';
  if ((v.make || '').includes('BMW')) return 'bmw';
  return 'def';
}

function vehicleCard(v) {
  const price = Number(v.list_price) > 0 ? money(v.list_price) : 'حسب الاتفاق';
  const accent = vehicleAccent(v);
  const scene = window.NajjarCar3D
    ? `<div class="nt-vcard-media">${window.NajjarCar3D.renderCar3D(v, { accent })}</div>`
    : '';
  return `
    <article class="vehicle-card nt-vcard nt-vcard--${accent}" data-vehicle-id="${v.id}" role="button" tabindex="0">
      ${scene}
      <div class="nt-vcard-top">
        <span class="nt-vcard-stock">${e(v.stock_no)}</span>
        ${pill(v.status)}
      </div>
      <h4>${e(v.make)} ${e(v.model)}</h4>
      <p class="nt-vcard-var">${e(v.variant || '')} · ${e(v.year || '—')} · ${e(v.color || '')}</p>
      <ul class="nt-vcard-meta">
        ${v.vin ? `<li><span>VIN</span><strong dir="ltr">${e(v.vin)}</strong></li>` : ''}
        ${v.plate_no ? `<li><span>اللوحة</span><strong>${e(v.plate_no)}</strong></li>` : ''}
        ${v.engine_cc ? `<li><span>المحرك</span><strong>${e(v.engine_cc)} cc</strong></li>` : ''}
        ${v.origin_country ? `<li><span>المنشأ</span><strong>${e(v.origin_country)}</strong></li>` : ''}
        ${v.import_ref ? `<li><span>الشحن</span><strong>${e(v.import_ref)}</strong></li>` : ''}
      </ul>
      <div class="nt-vcard-foot">
        <strong>${price}</strong>
        <span class="mini">تفاصيل →</span>
      </div>
    </article>`;
}

async function openVehicleDetail(id) {
  const data = await api('/vehicles/' + id);
  const v = data.vehicle;
  const priceDisplay = Number(v.list_price) > 0 ? money(v.list_price) : 'حسب الاتفاق';
  const licenseLink = vehicleDocLink(v);
  const scene3d = window.NajjarCar3D
    ? `<div class="nt-vcard-media" style="margin:12px 0 4px">${window.NajjarCar3D.renderCar3D(v)}</div>`
    : '';
  openDrawer(`
    <div class="drawer-title"><h2>${e(v.make)} ${e(v.model)}</h2><p>${e(v.stock_no)} · ${pill(v.status)}</p></div>
    ${scene3d}
    <div class="detail-list" style="margin:16px 0">
      <div class="detail-row"><span>الطراز</span><strong>${e(v.variant || '—')}</strong></div>
      <div class="detail-row"><span>النوع</span><strong>${e(v.vehicle_type || '—')}</strong></div>
      <div class="detail-row"><span>اللون / السنة</span><strong>${e(v.color || '—')} · ${e(v.year || '—')}</strong></div>
      <div class="detail-row"><span>رقم الهيكل</span><strong class="number">${e(v.vin || '—')}</strong></div>
      <div class="detail-row"><span>رقم المحرك</span><strong class="number">${e(v.engine_no || '—')}</strong></div>
      ${licenseDetailRows(v)}
      <div class="detail-row"><span>سعر الشراء</span><strong>${Number(v.purchase_cost) > 0 ? money(v.purchase_cost) : '—'}</strong></div>
      <div class="detail-row"><span>سعر البيع</span><strong>${priceDisplay}</strong></div>
      <div class="detail-row"><span>بلد المنشأ</span><strong>${e(v.origin_country || '—')}</strong></div>
      <div class="detail-row"><span>مرجع الاستيراد</span><strong>${e(v.import_ref || '—')}</strong></div>
      <div class="detail-row"><span>اللوحة</span><strong>${e(v.plate_no || '—')}</strong></div>
      ${v.notes ? `<div class="detail-row"><span>ملاحظات</span><strong>${e(v.notes)}</strong></div>` : ''}
    </div>
    ${licenseLink}
    <div class="form-actions">
      ${v.status !== 'مباعة' ? `<button class="btn success" type="button" id="btnSellVehicle">تسجيل بيع</button>` : ''}
      ${v.status === 'متاحة' ? `<button class="btn secondary" type="button" id="btnReserveVehicle">حجز</button>` : ''}
      <button class="btn secondary" type="button" id="btnWaVehicle">واتساب</button>
      <button class="btn ghost" type="button" id="btnPrintVehicle">طباعة عرض</button>
      <button class="btn secondary" type="button" id="btnEditVehicle">تعديل</button>
    </div>`);
  const sellBtn = document.getElementById('btnSellVehicle');
  if (sellBtn) sellBtn.onclick = () => showSaleForm(v);
  document.getElementById('btnWaVehicle').onclick = async () => {
    const c = await ensureCompany();
    const msg = encodeURIComponent(vehicleWhatsAppText(v, c));
    window.open(waLink('71924089') + '?text=' + msg, '_blank', 'noopener');
  };
  document.getElementById('btnPrintVehicle').onclick = () => printVehicleOffer(v);
  const reserveBtn = document.getElementById('btnReserveVehicle');
  if (reserveBtn) reserveBtn.onclick = () => showReserveForm(v);
  document.getElementById('btnEditVehicle').onclick = () => showEditVehicleForm(v);
}

function showReserveForm(v) {
  closeDrawer();
  openModal(`
    <h2>حجز مركبة — ${e(v.make)} ${e(v.model)}</h2>
    <div class="form-grid">
      <label class="field"><span>اسم العميل *</span><input id="rName"></label>
      <label class="field"><span>الهاتف</span><input id="rPhone"></label>
      <label class="field full"><span>ملاحظات</span><textarea id="rNotes" rows="2"></textarea></label>
    </div>
    <div class="form-actions">
      <button class="btn primary" type="button" id="btnConfirmReserve">تأكيد الحجز</button>
      <button class="btn ghost" type="button" onclick="closeModal()">إلغاء</button>
    </div>`);
  document.getElementById('btnConfirmReserve').onclick = async () => {
    const name = document.getElementById('rName').value.trim();
    if (!name) return toast('اسم العميل مطلوب', 'error');
    try {
      await api('/vehicles/' + v.id, {
        method: 'POST',
        body: {
          status: 'محجوزة',
          reserved_by: name,
          buyer_name: name,
          buyer_phone: document.getElementById('rPhone').value.trim(),
          notes: (v.notes ? v.notes + '\n' : '') + 'حجز: ' + (document.getElementById('rNotes').value.trim() || name),
        },
      });
      closeModal();
      toast('تم حجز المركبة');
      loadVehicles();
    } catch (err) { toast(err.message, 'error'); }
  };
}

function showAddVehicleForm() {
  openModal(`
    <h2>إضافة مركبة جديدة</h2>
    <div class="form-grid">
      <label class="field"><span>رقم المخزون *</span><input id="fStockNo" placeholder="NT-LR-002"></label>
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
      <label class="field"><span>وثيقة التأمين</span><input id="ePolicy" value="${e(v.insurance_policy || '')}"></label>
      <label class="field"><span>نوع التأمين</span><input id="eInsType" value="${e(v.insurance_type || '')}"></label>
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
          insurance_policy: document.getElementById('ePolicy').value.trim(),
          insurance_type: document.getElementById('eInsType').value.trim(),
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
      if (confirm('طباعة إيصال البيع؟')) {
        const c = await ensureCompany();
        printSaleReceipt({ ...res.sale, make: v.make, model: v.model, variant: v.variant }, c);
      }
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
          <th>رقم البيع</th><th>المركبة</th><th>المشتري</th><th>السعر</th><th>التاريخ</th><th>الحالة</th><th>إجراء</th>
        </tr></thead>
        <tbody>
          ${rows.length ? rows.map((r, i) => `
            <tr>
              <td><b>${e(r.sale_no)}</b></td>
              <td>${e(r.make || '')} ${e(r.model || '')} <span class="mini">${e(r.stock_no)}</span></td>
              <td>${e(r.buyer_name)}<br><span class="mini">${e(r.buyer_phone || '')}</span></td>
              <td class="money">${money(r.sale_price)}</td>
              <td>${dmy(r.sale_date)}</td>
              <td>${pill(r.status)}</td>
              <td><button type="button" class="btn secondary small" data-print-sale="${i}">طباعة</button></td>
            </tr>`).join('') : '<tr><td colspan="7" class="empty-state">لا مبيعات بعد</td></tr>'}
        </tbody>
      </table>
    </div>`;
  content.querySelectorAll('[data-print-sale]').forEach(btn => {
    btn.onclick = async () => {
      const r = rows[Number(btn.getAttribute('data-print-sale'))];
      const c = await ensureCompany();
      printSaleReceipt(r, c);
    };
  });
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
          <th>رقم الطلب</th><th>بلد المنشأ</th><th>المورد</th><th>عدد</th><th>التكلفة</th><th>الحالة</th><th>ETA</th><th>تحديث</th>
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
              <td>
                <select data-import-id="${r.id}" class="import-status-select">
                  ${['قيد الشحن', 'في الميناء', 'قيد التخليص', 'مستلم', 'ملغي'].map(s =>
                    `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
              </td>
            </tr>`).join('') : '<tr><td colspan="8" class="empty-state">لا طلبات استيراد — أضف طلباً جديداً</td></tr>'}
        </tbody>
      </table>
    </div>`;
  document.getElementById('btnAddImport').onclick = showAddImportForm;
  content.querySelectorAll('.import-status-select').forEach(sel => {
    sel.onchange = async () => {
      const id = sel.getAttribute('data-import-id');
      try {
        await api('/imports/' + id, { method: 'POST', body: { status: sel.value } });
        toast('تم تحديث حالة الاستيراد');
      } catch (err) {
        toast(err.message, 'error');
        loadImports();
      }
    };
  });
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
  if (!token) { location.replace('/auto-trading/login.html'); return; }
  try {
    const me = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json());
    const user = me.user || me;
    document.getElementById('userChip').textContent = user.name || user.username || '—';
    window.APP_USER = user;
  } catch (_) {}
  const qs = new URLSearchParams(location.search || '');
  const view = (qs.get('view') || '').trim();
  const start = ['vehicles', 'imports', 'sales', 'staff', 'company', 'dashboard'].includes(view) ? view : 'dashboard';
  if (start !== 'dashboard') {
    document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.section === start));
  }
  loadSection(start);
}

boot();
