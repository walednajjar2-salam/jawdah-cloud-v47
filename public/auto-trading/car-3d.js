/* NAJJAR TRADING — 3D car scenes + Instagram-style cards */
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

  /** CSS 3D car stage — slow orbit / float */
  function renderCar3D(v, opts = {}) {
    const accent = opts.accent || accentOf(v);
    const delay = opts.delay != null ? opts.delay : (Math.random() * 4).toFixed(1);
    const label = `${v.make || ''} ${v.model || ''}`.trim();
    return `
      <div class="car3d-scene car3d-scene--${accent}" style="--car-delay:${delay}s" aria-hidden="true">
        <div class="car3d-glow"></div>
        <div class="car3d-stage">
          <div class="car3d-orbit">
            <div class="car3d-car car3d-car--${accent}">
              <div class="car3d-shadow"></div>
              <div class="car3d-chassis">
                <div class="car3d-body"></div>
                <div class="car3d-cabin"></div>
                <div class="car3d-hood"></div>
                <div class="car3d-grille"></div>
                <div class="car3d-light car3d-light--l"></div>
                <div class="car3d-light car3d-light--r"></div>
                <div class="car3d-mirror car3d-mirror--l"></div>
                <div class="car3d-mirror car3d-mirror--r"></div>
                <div class="car3d-wheel car3d-wheel--fl"><i></i></div>
                <div class="car3d-wheel car3d-wheel--fr"><i></i></div>
                <div class="car3d-wheel car3d-wheel--rl"><i></i></div>
                <div class="car3d-wheel car3d-wheel--rr"><i></i></div>
              </div>
            </div>
          </div>
          <div class="car3d-floor"></div>
          <div class="car3d-reflection"></div>
        </div>
        <div class="car3d-caption">${esc(label)}</div>
      </div>`;
  }

  /** Instagram-style post card */
  function renderIgPost(v, opts = {}) {
    const accent = accentOf(v);
    const interactive = opts.interactive !== false;
    const idAttr = v.id != null ? ` data-vehicle-id="${esc(v.id)}"` : '';
    const wa = opts.whatsapp
      ? `<a class="ig-action ig-wa" href="https://wa.me/96871924089?text=${encodeURIComponent([
          'مرحباً NAJJAR TRADING',
          'أرغب بالاستفسار عن:',
          `${v.make} ${v.model} ${v.variant || ''}`.trim(),
          `مخزون: ${v.stock_no}`,
        ].filter(Boolean).join('\n'))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">واتساب</a>`
      : '';
    return `
      <article class="ig-post ig-post--${accent}"${idAttr} ${interactive ? 'role="button" tabindex="0"' : ''}>
        <header class="ig-post-head">
          <div class="ig-avatar ig-avatar--${accent}" aria-hidden="true"></div>
          <div class="ig-user">
            <strong>najjar.trading</strong>
            <span>${esc(v.stock_no)} · ${esc(v.origin_country || 'عُمان')}</span>
          </div>
          <span class="ig-pill ${statusClass(v.status)}">${esc(v.status || '')}</span>
        </header>
        <div class="ig-media">
          ${renderCar3D(v, { accent, delay: opts.delay })}
          <div class="ig-media-badge">${esc(v.year || '—')}</div>
        </div>
        <div class="ig-actions" aria-hidden="true">
          <span class="ig-heart">♡</span>
          <span class="ig-comment">💬</span>
          <span class="ig-send">➤</span>
          <span class="ig-save">⌫</span>
        </div>
        <div class="ig-body">
          <h3>${esc(v.make)} ${esc(v.model)} <em>${esc(v.variant || '')}</em></h3>
          <p class="ig-meta">${esc(v.color || '')} · ${esc(v.vehicle_type || '')}</p>
          <ul class="ig-facts">
            ${v.vin ? `<li><span>VIN</span><b dir="ltr">${esc(v.vin)}</b></li>` : ''}
            ${v.plate_no ? `<li><span>لوحة</span><b>${esc(v.plate_no)}</b></li>` : ''}
            ${v.engine_cc ? `<li><span>محرك</span><b>${esc(v.engine_cc)} cc</b></li>` : ''}
            ${v.import_ref ? `<li><span>شحن</span><b>${esc(v.import_ref)}</b></li>` : ''}
          </ul>
          <div class="ig-foot">
            <strong class="ig-price">${money(v.list_price)}</strong>
            ${wa}
          </div>
        </div>
      </article>`;
  }

  function renderStories(platforms) {
    const items = platforms || [
      { id: 'oman', label: 'عُمان', icon: '🇴🇲' },
      { id: 'america', label: 'أمريكا', icon: '🇺🇸' },
      { id: 'salam', label: 'سلام', icon: '🚗' },
      { id: 'dubai', label: 'دبي', icon: '🇦🇪' },
      { id: 'saudi', label: 'السعودية', icon: '🇸🇦' },
      { id: 'jordan', label: 'الأردن', icon: '🇯🇴' },
      { id: 'india', label: 'الهند', icon: '🇮🇳' },
      { id: 'iran', label: 'إيران', icon: '🇮🇷' },
    ];
    return `
      <div class="ig-stories" aria-label="منصات">
        ${items.map((p, i) => `
          <button type="button" class="ig-story" data-platform="${esc(p.id)}" style="--i:${i}">
            <span class="ig-story-ring"><span class="ig-story-icon">${p.icon || '🚘'}</span></span>
            <span class="ig-story-label">${esc(p.label_ar || p.label)}</span>
          </button>`).join('')}
      </div>`;
  }

  function renderFeed(vehicles, opts = {}) {
    const list = vehicles || [];
    return `
      <div class="ig-shell">
        ${opts.stories !== false ? renderStories(opts.platforms) : ''}
        <div class="ig-feed">
          ${list.map((v, i) => renderIgPost(v, { ...opts, delay: (i * 1.2).toFixed(1) })).join('') || '<p class="empty-state">لا توجد سيارات</p>'}
        </div>
      </div>`;
  }

  global.NajjarCar3D = { accentOf, renderCar3D, renderIgPost, renderStories, renderFeed, money, esc };
})(typeof window !== 'undefined' ? window : globalThis);
