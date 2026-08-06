/* NAJJAR & AL SAMOOM TRADING — Car showroom + 3D vehicle visuals */
(function (global) {
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[c]));

  function accentOf(v) {
    const make = String(v.make || '');
    const model = String(v.model || '');
    const variant = String(v.variant || '');
    if (make.includes('Land')) return 'lr';
    if (model.includes('GLE')) return 'gle';
    if (model.includes('G-Class') || variant.includes('G63')) return 'g63';
    if (make.includes('BMW')) return 'bmw';
    return 'def';
  }

  function money(v) {
    return Number(v || 0) > 0
      ? Number(v).toLocaleString('en-US', { maximumFractionDigits: 3 }) + ' ر.ع'
      : 'حسب الاتفاق';
  }

  function statusClass(s) {
    if (s === 'متاحة') return 'available';
    if (s === 'قيد الاستيراد') return 'importing';
    if (s === 'محجوزة') return 'reserved';
    if (s === 'مباعة') return 'sold';
    return 'draft';
  }

  function particlesHtml(n) {
    let out = '';
    for (let i = 0; i < n; i += 1) {
      const x = (8 + (i * 17) % 84);
      const y = (12 + (i * 29) % 70);
      const d = ((i * 0.55) % 6).toFixed(2);
      const s = (1.5 + (i % 4) * 0.7).toFixed(1);
      out += `<span class="car3d-spark" style="--sx:${x}%;--sy:${y}%;--sd:${d}s;--ss:${s}px"></span>`;
    }
    return out;
  }

  /** CSS 3D vehicle visual — used as showroom media until real photos are attached */
  function renderCar3D(v, opts = {}) {
    const accent = opts.accent || accentOf(v);
    const delay = opts.delay != null ? opts.delay : (Math.random() * 3).toFixed(1);
    const label = `${v.make || ''} ${v.model || ''}`.trim();
    const cinema = opts.cinema ? ' car3d-scene--cinema' : '';
    const hero = opts.hero ? ' car3d-scene--hero' : '';
    return `
      <div class="car3d-scene car3d-scene--${accent}${cinema}${hero}" style="--car-delay:${delay}s" aria-hidden="true">
        <div class="car3d-glow"></div>
        <div class="car3d-beams"></div>
        <div class="car3d-particles">${particlesHtml(opts.hero || opts.cinema ? 18 : 10)}</div>
        <div class="car3d-stage">
          <div class="car3d-orbit">
            <div class="car3d-car car3d-car--${accent}">
              <div class="car3d-shadow"></div>
              <div class="car3d-chassis">
                <div class="car3d-bumper car3d-bumper--f"></div>
                <div class="car3d-body"></div>
                <div class="car3d-side-line"></div>
                <div class="car3d-cabin"></div>
                <div class="car3d-roof"></div>
                <div class="car3d-hood"></div>
                <div class="car3d-grille"></div>
                <div class="car3d-light car3d-light--l"></div>
                <div class="car3d-light car3d-light--r"></div>
                <div class="car3d-fog car3d-fog--l"></div>
                <div class="car3d-fog car3d-fog--r"></div>
                <div class="car3d-mirror car3d-mirror--l"></div>
                <div class="car3d-mirror car3d-mirror--r"></div>
                <div class="car3d-spoiler"></div>
                <div class="car3d-bumper car3d-bumper--r"></div>
                <div class="car3d-wheel car3d-wheel--fl"><i></i><b></b></div>
                <div class="car3d-wheel car3d-wheel--fr"><i></i><b></b></div>
                <div class="car3d-wheel car3d-wheel--rl"><i></i><b></b></div>
                <div class="car3d-wheel car3d-wheel--rr"><i></i><b></b></div>
              </div>
            </div>
          </div>
          <div class="car3d-floor"></div>
          <div class="car3d-ring"></div>
          <div class="car3d-reflection"></div>
        </div>
        <div class="car3d-vignette"></div>
        <div class="car3d-caption">${esc(label)}</div>
        ${opts.badge ? `<div class="car3d-live">${esc(opts.badge)}</div>` : ''}
      </div>`;
  }

  function waHref(v) {
    return `https://wa.me/96871924089?text=${encodeURIComponent([
      'مرحباً NAJJAR & AL SAMOOM TRADING',
      'أرغب بالاستفسار عن السيارة التالية:',
      `${v.make} ${v.model} ${v.variant || ''}`.trim(),
      v.year ? `السنة: ${v.year}` : '',
      v.color ? `اللون: ${v.color}` : '',
      `رقم المخزون: ${v.stock_no || ''}`,
      v.vin ? `VIN: ${v.vin}` : '',
      v.plate_no ? `اللوحة: ${v.plate_no}` : '',
      `السعر: ${money(v.list_price)}`,
    ].filter(Boolean).join('\n'))}`;
  }

  function pill(status) {
    return `<span class="pill ${statusClass(status)}">${esc(status || '')}</span>`;
  }

  function specRows(v, limit) {
    const rows = [
      v.vin ? ['VIN', v.vin, true] : null,
      v.plate_no ? ['اللوحة', v.plate_no, false] : null,
      v.engine_cc ? ['المحرك', `${v.engine_cc} cc`, false] : null,
      v.year ? ['السنة', String(v.year), false] : null,
      v.vehicle_type ? ['النوع', v.vehicle_type, false] : null,
      v.origin_country ? ['المنشأ', v.origin_country, false] : null,
      v.import_ref ? ['الشحن / المرجع', v.import_ref, false] : null,
      v.seats ? ['المقاعد', String(v.seats), false] : null,
      v.insurance_company ? ['التأمين', v.insurance_company, false] : null,
    ].filter(Boolean);
    const list = typeof limit === 'number' ? rows.slice(0, limit) : rows;
    return list.map(([label, value, ltr]) => `
      <li>
        <span>${esc(label)}</span>
        <strong${ltr ? ' dir="ltr"' : ''}>${esc(value)}</strong>
      </li>`).join('');
  }

  /** Professional showroom listing card — specs + visual + WhatsApp */
  function renderShowroomCard(v, opts = {}) {
    const accent = accentOf(v);
    const idAttr = v.id != null ? ` data-vehicle-id="${esc(v.id)}"` : '';
    const idx = opts.index != null ? ` data-index="${opts.index}"` : '';
    const stock = v.stock_no || `CAR-${(opts.index || 0) + 1}`;
    return `
      <article class="nt-vcard nt-show-card nt-vcard--${accent}"${idAttr}${idx} role="button" tabindex="0">
        <div class="nt-show-media">
          ${renderCar3D(v, { accent, delay: opts.delay, cinema: true, badge: v.year || 'NAJJAR' })}
          <div class="nt-show-media-badge">${esc(v.status || '')}</div>
        </div>
        <div class="nt-vcard-top">
          <span class="nt-vcard-stock">${esc(stock)}</span>
          ${pill(v.status)}
        </div>
        <h3>${esc(v.make)} ${esc(v.model)}</h3>
        <p class="nt-vcard-var">${esc(v.variant || '')} · ${esc(v.year || '—')} · ${esc(v.color || '')}</p>
        <ul class="nt-vcard-meta">
          ${specRows(v, 4)}
        </ul>
        <div class="nt-vcard-foot">
          <strong class="nt-show-price">${money(v.list_price)}</strong>
          <div class="nt-show-actions">
            <a class="nt-btn primary nt-show-wa" href="${waHref(v)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">واتساب</a>
            <span class="nt-show-more">التفاصيل</span>
          </div>
        </div>
      </article>`;
  }

  function renderFilters(vehicles, active) {
    const counts = { all: vehicles.length, متاحة: 0, 'قيد الاستيراد': 0, محجوزة: 0 };
    vehicles.forEach((v) => {
      if (counts[v.status] != null) counts[v.status] += 1;
    });
    const chips = [
      ['all', 'الكل', counts.all],
      ['متاحة', 'متاحة للبيع', counts.متاحة],
      ['قيد الاستيراد', 'قيد الاستيراد', counts['قيد الاستيراد']],
      ['محجوزة', 'محجوزة', counts.محجوزة],
    ];
    return `
      <div class="nt-show-filters" role="group" aria-label="تصفية السيارات">
        ${chips.map(([id, label, n]) => `
          <button type="button" class="nt-show-chip${active === id ? ' active' : ''}" data-filter="${esc(id)}">
            ${esc(label)} <em>${n}</em>
          </button>`).join('')}
      </div>`;
  }

  function renderShowroom(vehicles, opts = {}) {
    const list = vehicles || [];
    const filter = opts.filter || 'all';
    const filtered = filter === 'all' ? list : list.filter((v) => v.status === filter);
    return `
      <div class="nt-showroom-shell">
        ${opts.hero !== false ? renderHero(list) : ''}
        <section class="nt-cust-intro">
          <div>
            <h2>سيارات المعرض</h2>
            <p>عرض المواصفات · الصور · السعر · التواصل المباشر عبر واتساب</p>
          </div>
          ${renderFilters(list, filter)}
        </section>
        <div class="nt-showroom" data-showroom>
          ${filtered.length
            ? filtered.map((v, i) => renderShowroomCard(v, {
              ...opts,
              delay: (i * 0.9).toFixed(1),
              index: list.indexOf(v),
            })).join('')
            : '<p class="empty-state">لا توجد سيارات في هذا التصنيف</p>'}
        </div>
      </div>
      <div id="ntVehicleSheet" class="nt-vehicle-sheet" hidden></div>`;
  }

  function renderHero(vehicles) {
    const v = (vehicles && vehicles[0]) || { make: 'NAJJAR', model: 'TRADING', variant: 'SHOWROOM' };
    return `
      <section class="nt-cinema-hero nt-show-hero">
        <div class="nt-cinema-stage">
          ${renderCar3D(v, { hero: true, cinema: true, delay: 0, badge: v.year || 'SHOWROOM' })}
        </div>
        <div class="nt-cinema-copy">
          <p class="nt-kicker">NAJJAR &amp; AL SAMOOM TRADING</p>
          <h2>معرض السيارات المستعملة والمستوردة</h2>
          <p>تصفّح المخزون بالمواصفات الكاملة — VIN، اللون، المحرك، المنشأ — وتواصل معنا مباشرة للحجز أو الاستفسار.</p>
          <div class="nt-cinema-actions">
            <a class="nt-btn primary" href="#custRoot">عرض السيارات</a>
            <a class="nt-btn ghost" href="https://wa.me/96871924089" target="_blank" rel="noopener">واتساب المعرض</a>
          </div>
        </div>
      </section>`;
  }

  function ensureOverlay(id, cls) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = cls;
      el.hidden = true;
      document.body.appendChild(el);
    }
    return el;
  }

  /** Full vehicle detail sheet — replaces Instagram story/cinema overlays */
  function openVehicleSheet(vehicles, startIndex) {
    const list = vehicles || [];
    if (!list.length) return;
    let i = Math.max(0, Math.min(startIndex || 0, list.length - 1));
    const overlay = ensureOverlay('ntVehicleSheet', 'nt-vehicle-sheet');

    function paint() {
      const v = list[i];
      const accent = accentOf(v);
      overlay.hidden = false;
      document.body.classList.add('nt-lock');
      overlay.innerHTML = `
        <div class="nt-vehicle-sheet-panel nt-vehicle-sheet-panel--${accent}" role="dialog" aria-modal="true" aria-label="تفاصيل السيارة">
          <button type="button" class="nt-story-close" aria-label="إغلاق">✕</button>
          <div class="nt-vehicle-sheet-media">
            ${renderCar3D(v, { accent, cinema: true, hero: true, delay: 0, badge: v.stock_no || 'NAJJAR' })}
          </div>
          <div class="nt-vehicle-sheet-body">
            <div class="nt-vcard-top">
              <span class="nt-vcard-stock">${esc(v.stock_no || '')}</span>
              ${pill(v.status)}
            </div>
            <h3>${esc(v.make)} ${esc(v.model)} <em>${esc(v.variant || '')}</em></h3>
            <p class="nt-vcard-var">${esc(v.color || '')} · ${esc(v.vehicle_type || '')} · ${esc(v.year || '—')}</p>
            <ul class="nt-vcard-meta nt-vcard-meta--sheet">
              ${specRows(v)}
              ${v.license_doc_no ? `<li><span>رقم الوثيقة</span><strong>${esc(v.license_doc_no)}</strong></li>` : ''}
              ${v.notes ? `<li class="nt-sheet-notes"><span>ملاحظات</span><strong>${esc(v.notes)}</strong></li>` : ''}
            </ul>
            <div class="nt-vehicle-sheet-foot">
              <strong class="nt-show-price">${money(v.list_price)}</strong>
              <div class="nt-show-actions">
                <button type="button" class="nt-btn ghost" data-sheet-prev ${i <= 0 ? 'disabled' : ''}>السابق</button>
                <button type="button" class="nt-btn ghost" data-sheet-next ${i >= list.length - 1 ? 'disabled' : ''}>التالي</button>
                <a class="nt-btn primary" href="${waHref(v)}" target="_blank" rel="noopener">استفسار واتساب</a>
              </div>
            </div>
          </div>
        </div>`;
      overlay.querySelector('.nt-story-close').onclick = close;
      const prev = overlay.querySelector('[data-sheet-prev]');
      const next = overlay.querySelector('[data-sheet-next]');
      if (prev) prev.onclick = () => { i -= 1; paint(); };
      if (next) next.onclick = () => { i += 1; paint(); };
    }

    function close() {
      overlay.hidden = true;
      overlay.innerHTML = '';
      document.body.classList.remove('nt-lock');
    }

    overlay.onclick = (ev) => { if (ev.target === overlay) close(); };
    paint();
  }

  function bindShowroom(root, vehicles, opts = {}) {
    if (!root) return;
    const list = vehicles || [];
    root.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.onclick = () => {
        if (typeof opts.onFilter === 'function') opts.onFilter(btn.getAttribute('data-filter'));
      };
    });
    root.querySelectorAll('.nt-show-card[data-index], .nt-show-card[data-vehicle-id]').forEach((el) => {
      const open = (ev) => {
        if (ev.target.closest('a,button')) return;
        const index = Number(el.getAttribute('data-index') || 0);
        openVehicleSheet(list, index);
        if (typeof opts.onVehicle === 'function') {
          opts.onVehicle(Number(el.getAttribute('data-vehicle-id')), index);
        }
      };
      el.onclick = open;
      el.onkeydown = (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          open(ev);
        }
      };
    });
  }

  /* —— Legacy aliases (no Instagram chrome) —— */
  function renderIgPost(v, opts) { return renderShowroomCard(v, opts); }
  function renderReel(v, opts) { return renderShowroomCard(v, opts); }
  function renderStories() { return ''; }
  function renderFeed(vehicles, opts) { return renderShowroom(vehicles, opts); }
  function openStoryViewer(vehicles, startIndex) { return openVehicleSheet(vehicles, startIndex); }
  function openCinema(vehicles, startIndex) { return openVehicleSheet(vehicles, startIndex); }
  function bindGallery(root, vehicles, opts) { return bindShowroom(root, vehicles, opts); }
  function setMode() { /* showroom has no feed/reels modes */ }

  global.NajjarCar3D = {
    accentOf,
    renderCar3D,
    renderShowroomCard,
    renderShowroom,
    renderIgPost,
    renderReel,
    renderStories,
    renderFeed,
    renderHero,
    openVehicleSheet,
    openStoryViewer,
    openCinema,
    bindShowroom,
    bindGallery,
    setMode,
    money,
    esc,
    waHref,
  };
})(typeof window !== 'undefined' ? window : globalThis);
