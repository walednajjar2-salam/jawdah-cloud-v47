/* Phase 3 — Interactive Nizwa Heritage GIS */
window.NizwaGIS = {
  SITE: {
    name: 'نزوى — حي التراث',
    subtitle: 'مبنى الشقق التشغيلي · Quality of Launch',
    lat: 22.9336,
    lng: 57.5300,
  },

  LAYOUT: {
    '101': { left: 11, top: 70, floor: 1, wing: 'أ' },
    '102': { left: 27, top: 70, floor: 1, wing: 'أ' },
    '103': { left: 43, top: 70, floor: 1, wing: 'أ' },
    '104': { left: 59, top: 70, floor: 1, wing: 'ب' },
    '105': { left: 75, top: 70, floor: 1, wing: 'ب' },
    '119': { left: 18, top: 42, floor: 2, wing: 'أ' },
    '120': { left: 38, top: 42, floor: 2, wing: 'أ' },
    '121': { left: 58, top: 42, floor: 2, wing: 'ب' },
    '122': { left: 78, top: 42, floor: 2, wing: 'ب' },
  },

  rows() {
    return typeof collectApartmentRows === 'function' ? collectApartmentRows() : [];
  },

  pinStatus(row) {
    const p = row.property || {};
    if (String(p.status || '').toLowerCase().includes('maintenance')) return 'maintenance';
    if (row.shortContract) return 'short';
    if (row.statusAr === 'مستأجرة') return 'rented';
    if (row.statusAr === 'شاغرة') return 'vacant';
    return 'unknown';
  },

  statusLabel(st) {
    return (
      { rented: 'مستأجرة', vacant: 'شاغرة', short: 'عقد قصير', maintenance: 'صيانة', unknown: '—' }[st] || st
    );
  },

  mapSvgBg() {
    return `<svg class="nizwa-map-svg" viewBox="0 0 800 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="nizwaSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e3a5f"/><stop offset="100%" stop-color="#0f172a"/></linearGradient>
        <linearGradient id="nizwaSand" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c4a574"/><stop offset="100%" stop-color="#8b6914"/></linearGradient>
        <linearGradient id="nizwaWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d4c4a8"/><stop offset="100%" stop-color="#a89070"/></linearGradient>
      </defs>
      <rect width="800" height="480" fill="url(#nizwaSky)"/>
      <ellipse cx="400" cy="420" rx="320" ry="40" fill="rgba(0,0,0,.25)"/>
      <path d="M120 380 L680 380 L680 180 L640 140 L160 140 L120 180 Z" fill="url(#nizwaWall)" stroke="#6b5344" stroke-width="3"/>
      <path d="M160 140 L400 80 L640 140" fill="none" stroke="#8b6914" stroke-width="4"/>
      <rect x="140" y="200" width="520" height="8" fill="#8b6914" opacity=".6"/>
      <rect x="140" y="290" width="520" height="8" fill="#8b6914" opacity=".6"/>
      <text x="400" y="115" text-anchor="middle" fill="#4a3728" font-size="22" font-family="Tajawal,sans-serif" font-weight="700">حي التراث — نزوى</text>
      <text x="400" y="138" text-anchor="middle" fill="#6b5344" font-size="14" font-family="Tajawal,sans-serif">Nizwa Heritage District</text>
      <rect x="155" y="318" width="230" height="52" rx="6" fill="rgba(64,224,208,.08)" stroke="rgba(64,224,208,.35)" stroke-width="1"/>
      <rect x="415" y="318" width="230" height="52" rx="6" fill="rgba(64,224,208,.08)" stroke="rgba(64,224,208,.35)" stroke-width="1"/>
      <text x="270" y="352" text-anchor="middle" fill="#94a3b8" font-size="13" font-family="Tajawal">الطابق 1 · 101–105</text>
      <text x="530" y="352" text-anchor="middle" fill="#94a3b8" font-size="13" font-family="Tajawal">الطابق 2 · 119–122</text>
      <circle cx="720" cy="60" r="28" fill="url(#nizwaSand)" opacity=".85"/>
      <text x="720" y="66" text-anchor="middle" fill="#3d2e1f" font-size="11" font-family="Tajawal">قلعة</text>
      <text x="720" y="78" text-anchor="middle" fill="#3d2e1f" font-size="10" font-family="Tajawal">نزوى</text>
    </svg>`;
  },

  legendHtml() {
    return `<div class="nizwa-gis-legend">
      <span class="leg rented"><i></i> مستأجرة</span>
      <span class="leg vacant"><i></i> شاغرة</span>
      <span class="leg short"><i></i> عقد قصير</span>
      <span class="leg maintenance"><i></i> صيانة</span>
    </div>`;
  },

  pinHtml(row, mini) {
    const layout = this.LAYOUT[row.no] || { left: 50, top: 55, floor: 0 };
    const st = this.pinStatus(row);
    const label = mini ? row.no : `${row.no}`;
    return `<button type="button" class="nizwa-pin ${st}${row.no === this._selected ? ' selected' : ''}"
      style="left:${layout.left}%;top:${layout.top}%"
      data-apt="${row.no}"
      title="شقة ${row.no} — ${this.statusLabel(st)}"
      onclick="NizwaGIS.selectPin('${row.no}')">
      <span class="nizwa-pin-no">${label}</span>
      ${st === 'short' ? '<span class="nizwa-pin-pulse"></span>' : ''}
    </button>`;
  },

  statsHtml(rows) {
    const rented = rows.filter(r => r.statusAr === 'مستأجرة').length;
    const vacant = rows.filter(r => r.statusAr === 'شاغرة').length;
    const short = rows.filter(r => r.shortContract).length;
    const total = rows.length;
    const occ = total ? Math.round((rented / total) * 100) : 0;
    return `<div class="nizwa-gis-stats">
      <div><span>الشقق</span><strong>${typeof fmt === 'function' ? fmt(total) : total}</strong></div>
      <div><span>مستأجرة</span><strong class="c-rented">${typeof fmt === 'function' ? fmt(rented) : rented}</strong></div>
      <div><span>شاغرة</span><strong class="c-vacant">${typeof fmt === 'function' ? fmt(vacant) : vacant}</strong></div>
      <div><span>عقود قصيرة</span><strong class="c-short">${typeof fmt === 'function' ? fmt(short) : short}</strong></div>
      <div><span>الإشغال</span><strong class="c-occ">${typeof fmt === 'function' ? fmt(occ) : occ}%</strong></div>
    </div>`;
  },

  detailHtml(row) {
    if (!row) {
      return `<div class="nizwa-gis-detail empty"><p class="mini">اضغط على أي شقة في الخريطة لعرض التفاصيل التشغيلية</p></div>`;
    }
    const st = this.pinStatus(row);
    const actions = [];
    if (row.contract?.id) {
      actions.push(`<button class="ghost" onclick="renewContract('${row.contract.id}')">${typeof ic === 'function' ? ic('refresh-cw') : ''} تجديد</button>`);
      actions.push(`<button class="ghost" onclick="invoiceFromContract('${row.contract.id}')">${typeof ic === 'function' ? ic('receipt') : ''} فاتورة</button>`);
    }
    if (row.phone && row.phone !== '—' && window.ReminderHub) {
      const msg = `مرحباً ${row.tenant}، بخصوص شقة ${row.no} — نزوى حي التراث.`;
      actions.push(`<a class="glass-btn glass-btn-wa" href="${ReminderHub.waUrl(row.phone, msg)}" target="_blank" rel="noopener">${typeof ic === 'function' ? ic('message-circle') : ''} واتساب</a>`);
    }
    actions.push(`<button class="ghost" onclick="showSection('apartments')">جدول الشقق</button>`);

    return `<div class="nizwa-gis-detail active">
      <header><div><h3>شقة ${row.no}</h3><span class="badge ${st === 'short' ? 'short-contract' : st}">${row.shortContract ? row.shortLabel || 'عقد قصير' : this.statusLabel(st)}</span></div>
        <span class="nizwa-wing mini">الطابق ${this.LAYOUT[row.no]?.floor || '—'} · wing ${this.LAYOUT[row.no]?.wing || '—'}</span></header>
      <div class="nizwa-detail-grid">
        <div><span>المستأجر</span><b>${row.tenant || '—'}</b></div>
        <div><span>الهاتف</span><b>${row.phone || '—'}</b></div>
        <div><span>نوع الوحدة</span><b>${row.unitType}</b></div>
        <div><span>الغرف</span><b>${row.rooms}</b></div>
        <div><span>الإيجار</span><b>${typeof money === 'function' ? money(row.rent) : row.rent}</b></div>
        <div><span>متوسط السوق</span><b>${typeof money === 'function' ? money(row.avgRent) : row.avgRent}</b></div>
        <div><span>بداية العقد</span><b>${row.start}</b></div>
        <div><span>نهاية العقد</span><b>${row.end}</b></div>
      </div>
      <div class="nizwa-detail-actions">${actions.join('')}</div>
    </div>`;
  },

  mapHtml(rows, opts = {}) {
    const mini = !!opts.mini;
    const filter = this._filter || 'all';
    const filtered = filter === 'all' ? rows : rows.filter(r => this.pinStatus(r) === filter);
    return `<div class="nizwa-gis-map ${mini ? 'mini' : 'full'}">
      ${this.mapSvgBg()}
      <div class="nizwa-pins-layer">${filtered.map(r => this.pinHtml(r, mini)).join('')}</div>
      ${mini ? `<button type="button" class="nizwa-expand-btn" onclick="showSection('nizwa-gis')">${typeof ic === 'function' ? ic('maximize-2') : ''} عرض كامل</button>` : ''}
    </div>`;
  },

  selectPin(no) {
    this._selected = no;
    const rows = this.rows();
    const row = rows.find(r => r.no === no);
    const detailEl = document.getElementById(this._detailId || 'nizwaGisDetail');
    if (detailEl) {
      detailEl.innerHTML = this.detailHtml(row);
      if (typeof paintIcons === 'function') paintIcons(detailEl);
    }
    document.querySelectorAll('.nizwa-pin').forEach(p => {
      p.classList.toggle('selected', p.dataset.apt === no);
    });
  },

  setFilter(f) {
    this._filter = f;
    this.render(this._lastHost, { detailId: this._detailId, mini: this._mini });
  },

  render(hostId, opts = {}) {
    const host = typeof hostId === 'string' ? document.getElementById(hostId) : hostId;
    if (!host) return;
    this._lastHost = typeof hostId === 'string' ? hostId : host.id;
    this._detailId = opts.detailId || 'nizwaGisDetail';
    this._mini = !!opts.mini;

    if (opts.mini) {
      const rows = this.rows();
      host.innerHTML = this.mapHtml(rows, { mini: true });
      if (typeof paintIcons === 'function') paintIcons(host);
      return;
    }

    const rows = this.rows();
    host.innerHTML = `
      ${this.statsHtml(rows)}
      <div class="nizwa-gis-toolbar">
        <div class="nizwa-gis-filters">
          ${['all', 'rented', 'vacant', 'short', 'maintenance'].map(f => `
            <button type="button" class="ghost nizwa-filter ${this._filter === f || (!this._filter && f === 'all') ? 'active' : ''}" onclick="NizwaGIS.setFilter('${f}')">
              ${f === 'all' ? 'الكل' : this.statusLabel(f)}
            </button>`).join('')}
        </div>
        <div class="nizwa-gis-coords mini"><i data-lucide="map-pin" class="lucide-icon"></i> ${this.SITE.lat.toFixed(4)}°N · ${this.SITE.lng.toFixed(4)}°E · ${this.SITE.name}</div>
        <button class="ghost" onclick="NizwaGIS.openExternalMap()">${typeof ic === 'function' ? ic('external-link') : ''} Google Maps</button>
        <button class="ghost" onclick="NizwaGIS.downloadPdf()">${typeof ic === 'function' ? ic('file-down') : ''} PDF</button>
      </div>
      <div class="nizwa-gis-layout">
        <div class="nizwa-gis-map-wrap">${this.mapHtml(rows)}${this.legendHtml()}</div>
        <div id="${this._detailId}">${this.detailHtml(this._selected ? rows.find(r => r.no === this._selected) : null)}</div>
      </div>`;

    if (typeof paintIcons === 'function') paintIcons(host);
    if (this._selected) this.selectPin(this._selected);
  },

  renderMini(hostId) {
    this.render(hostId || 'gisPins', { mini: true });
  },

  openExternalMap() {
    const q = encodeURIComponent('Nizwa Heritage District, Nizwa, Oman');
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener');
  },

  pdfHtml() {
    const esc = CompanyProfile?.escapeHtml?.bind(CompanyProfile) || (x => String(x ?? ''));
    const s = CompanyProfile?.settings || {};
    const rows = this.rows();
    const body = rows.map(r =>
      `<tr><td>${esc(r.no)}</td><td>${esc(this.statusLabel(this.pinStatus(r)))}</td><td>${esc(r.tenant)}</td><td>${esc(typeof money === 'function' ? money(r.rent) : r.rent)}</td><td>${esc(r.end)}</td></tr>`
    ).join('');
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
      body{font-family:Tajawal,Arial;padding:24px;background:#fdfbf7}
      .qls-doc{max-width:800px;margin:0 auto}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}
      th,td{border:1px solid #ddd;padding:8px;text-align:right} th{background:#f5efe6}
      tr.short{background:#fee2e2}
    </style></head><body><article class="qls-doc">
      <h1>GIS تشغيلي — ${esc(this.SITE.name)}</h1>
      <p>${esc(s.name_ar)} · ${esc(new Date().toLocaleString('ar-OM'))}</p>
      <p>الإحداثيات: ${this.SITE.lat}°N, ${this.SITE.lng}°E</p>
      <table><thead><tr><th>الشقة</th><th>الحالة</th><th>المستأجر</th><th>الإيجار</th><th>نهاية العقد</th></tr></thead>
      <tbody>${body}</tbody></table>
    </article></body></html>`;
  },

  async downloadPdf() {
    if (typeof downloadHtmlAsPdf !== 'function') return toast('PDF غير متاح', true);
    await downloadHtmlAsPdf(this.pdfHtml(), `nizwa-gis-${new Date().toISOString().slice(0, 10)}.pdf`);
  },
};

function renderNizwaGis() {
  NizwaGIS.render('nizwaGisHost', { detailId: 'nizwaGisDetail' });
}
