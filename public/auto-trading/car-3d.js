/* NAJJAR & AL SAMOOM TRADING — Cinematic 3D cars + Instagram / Reels / Stories */
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

  /** Rich CSS 3D car — slow cinematic orbit */
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
      'أرغب بالاستفسار عن:',
      `${v.make} ${v.model} ${v.variant || ''}`.trim(),
      `مخزون: ${v.stock_no || ''}`,
      v.vin ? `VIN: ${v.vin}` : '',
    ].filter(Boolean).join('\n'))}`;
  }

  function renderIgPost(v, opts = {}) {
    const accent = accentOf(v);
    const interactive = opts.interactive !== false;
    const idAttr = v.id != null ? ` data-vehicle-id="${esc(v.id)}"` : '';
    const idx = opts.index != null ? ` data-index="${opts.index}"` : '';
    const wa = opts.whatsapp
      ? `<a class="ig-action ig-wa" href="${waHref(v)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">واتساب</a>`
      : '';
    return `
      <article class="ig-post ig-post--${accent}"${idAttr}${idx} ${interactive ? 'role="button" tabindex="0"' : ''}>
        <header class="ig-post-head">
          <div class="ig-avatar ig-avatar--${accent}" aria-hidden="true"></div>
          <div class="ig-user">
            <strong>najjar.trading</strong>
            <span>${esc(v.stock_no || '')} · ${esc(v.origin_country || 'عُمان')}</span>
          </div>
          <button type="button" class="ig-open-story" data-story-index="${opts.index || 0}" onclick="event.stopPropagation()">▶ قصة</button>
          <span class="ig-pill ${statusClass(v.status)}">${esc(v.status || '')}</span>
        </header>
        <div class="ig-media">
          ${renderCar3D(v, { accent, delay: opts.delay, cinema: true })}
          <div class="ig-media-badge">${esc(v.year || '—')}</div>
          <button type="button" class="ig-cinema-btn" data-cinema-index="${opts.index || 0}" onclick="event.stopPropagation()">⛶ سينما</button>
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

  function renderReel(v, opts = {}) {
    const accent = accentOf(v);
    return `
      <article class="ig-reel ig-reel--${accent}" data-index="${opts.index || 0}" ${v.id != null ? `data-vehicle-id="${esc(v.id)}"` : ''}>
        <div class="ig-reel-media">
          ${renderCar3D(v, { accent, delay: opts.delay, cinema: true, hero: true, badge: 'REEL' })}
        </div>
        <div class="ig-reel-side">
          <button type="button" class="ig-reel-btn" aria-label="like">♡</button>
          <button type="button" class="ig-reel-btn" aria-label="comment">💬</button>
          <a class="ig-reel-btn" href="${waHref(v)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">↗</a>
        </div>
        <div class="ig-reel-info">
          <strong>najjar.trading</strong>
          <h3>${esc(v.make)} ${esc(v.model)}</h3>
          <p>${esc(v.variant || '')} · ${esc(v.year || '')} · ${esc(v.color || '')}</p>
          <span class="ig-pill ${statusClass(v.status)}">${esc(v.status || '')}</span>
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
        <button type="button" class="ig-story ig-story--live" data-open-gallery="0" style="--i:0">
          <span class="ig-story-ring"><span class="ig-story-icon">✦</span></span>
          <span class="ig-story-label">معرض</span>
        </button>
        ${items.map((p, i) => `
          <button type="button" class="ig-story" data-platform="${esc(p.id)}" style="--i:${i + 1}">
            <span class="ig-story-ring"><span class="ig-story-icon">${p.icon || '🚘'}</span></span>
            <span class="ig-story-label">${esc(p.label_ar || p.label)}</span>
          </button>`).join('')}
      </div>`;
  }

  function renderHero(vehicles) {
    const v = (vehicles && vehicles[0]) || { make: 'NAJJAR', model: 'TRADING', variant: 'SHOWROOM' };
    return `
      <section class="nt-cinema-hero">
        <div class="nt-cinema-stage">
          ${renderCar3D(v, { hero: true, cinema: true, delay: 0, badge: 'SLOW MOTION 3D' })}
        </div>
        <div class="nt-cinema-copy">
          <p class="nt-kicker">NAJJAR SHOWROOM</p>
          <h2>معرض سينمائي متحرك</h2>
          <p>سيارات ثلاثية الأبعاد · حركة بطيئة مرتبة · تجربة تشبه إنستغرام وريلز</p>
          <div class="nt-cinema-actions">
            <button type="button" class="nt-btn primary" data-open-gallery="0">▶ تشغيل القصص</button>
            <button type="button" class="nt-btn ghost" data-view-jump="reels">ريلز</button>
          </div>
        </div>
      </section>`;
  }

  function renderFeed(vehicles, opts = {}) {
    const list = vehicles || [];
    return `
      <div class="ig-shell">
        ${opts.hero !== false ? renderHero(list) : ''}
        ${opts.stories !== false ? renderStories(opts.platforms) : ''}
        <div class="ig-feed ${opts.mode === 'grid' ? 'ig-feed--grid' : ''}" data-feed>
          ${list.map((v, i) => renderIgPost(v, { ...opts, delay: (i * 1.1).toFixed(1), index: i })).join('') || '<p class="empty-state">لا توجد سيارات</p>'}
        </div>
        <div class="ig-reels ${opts.mode === 'reels' ? 'is-on' : ''}" data-reels hidden>
          ${list.map((v, i) => renderReel(v, { delay: (i * 0.8).toFixed(1), index: i })).join('')}
        </div>
      </div>
      <div id="ntStoryOverlay" class="nt-story-overlay" hidden></div>
      <div id="ntCinemaOverlay" class="nt-cinema-overlay" hidden></div>`;
  }

  /* ——— Story / Cinema controllers ——— */
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

  function openStoryViewer(vehicles, startIndex) {
    const list = vehicles || [];
    if (!list.length) return;
    let i = Math.max(0, Math.min(startIndex || 0, list.length - 1));
    const overlay = ensureOverlay('ntStoryOverlay', 'nt-story-overlay');
    let timer = null;
    const DURATION = 5200;

    function paint() {
      const v = list[i];
      const accent = accentOf(v);
      overlay.hidden = false;
      overlay.innerHTML = `
        <div class="nt-story nt-story--${accent}">
          <div class="nt-story-bars">${list.map((_, idx) => `<i class="${idx < i ? 'done' : idx === i ? 'active' : ''}"></i>`).join('')}</div>
          <header class="nt-story-head">
            <div class="ig-avatar ig-avatar--${accent}"></div>
            <div><strong>najjar.trading</strong><span>${esc(v.stock_no || '')}</span></div>
            <button type="button" class="nt-story-close" aria-label="إغلاق">✕</button>
          </header>
          <div class="nt-story-media">${renderCar3D(v, { accent, cinema: true, hero: true, delay: 0, badge: `${i + 1}/${list.length}` })}</div>
          <div class="nt-story-caption">
            <h3>${esc(v.make)} ${esc(v.model)} ${esc(v.variant || '')}</h3>
            <p>${esc(v.color || '')} · ${esc(v.year || '')} · ${money(v.list_price)}</p>
            <a class="nt-btn primary" href="${waHref(v)}" target="_blank" rel="noopener">تواصل واتساب</a>
          </div>
          <button type="button" class="nt-story-tap nt-story-tap--prev" aria-label="السابق"></button>
          <button type="button" class="nt-story-tap nt-story-tap--next" aria-label="التالي"></button>
        </div>`;
      overlay.querySelector('.nt-story-close').onclick = close;
      overlay.querySelector('.nt-story-tap--prev').onclick = () => go(i - 1);
      overlay.querySelector('.nt-story-tap--next').onclick = () => go(i + 1);
      clearTimeout(timer);
      timer = setTimeout(() => go(i + 1), DURATION);
    }

    function go(n) {
      if (n < 0) { close(); return; }
      if (n >= list.length) { close(); return; }
      i = n;
      paint();
    }

    function close() {
      clearTimeout(timer);
      overlay.hidden = true;
      overlay.innerHTML = '';
      document.body.classList.remove('nt-lock');
    }

    document.body.classList.add('nt-lock');
    paint();
    overlay.onclick = (ev) => { if (ev.target === overlay) close(); };
  }

  function openCinema(vehicles, startIndex) {
    const list = vehicles || [];
    if (!list.length) return;
    let i = Math.max(0, Math.min(startIndex || 0, list.length - 1));
    const overlay = ensureOverlay('ntCinemaOverlay', 'nt-cinema-overlay');
    const v = list[i];
    const accent = accentOf(v);
    overlay.hidden = false;
    document.body.classList.add('nt-lock');
    overlay.innerHTML = `
      <div class="nt-cinema-frame">
        <button type="button" class="nt-story-close" aria-label="إغلاق">✕</button>
        <div class="nt-cinema-canvas">${renderCar3D(v, { accent, cinema: true, hero: true, delay: 0, badge: 'CINEMA MODE' })}</div>
        <div class="nt-cinema-meta">
          <button type="button" class="nt-btn ghost" data-cprev>‹</button>
          <div>
            <h3>${esc(v.make)} ${esc(v.model)} ${esc(v.variant || '')}</h3>
            <p>${esc(v.stock_no || '')} · ${money(v.list_price)}</p>
          </div>
          <button type="button" class="nt-btn ghost" data-cnext>›</button>
          <a class="nt-btn primary" href="${waHref(v)}" target="_blank" rel="noopener">واتساب</a>
        </div>
      </div>`;
    const close = () => {
      overlay.hidden = true;
      overlay.innerHTML = '';
      document.body.classList.remove('nt-lock');
    };
    overlay.querySelector('.nt-story-close').onclick = close;
    overlay.querySelector('[data-cprev]').onclick = () => openCinema(list, i - 1);
    overlay.querySelector('[data-cnext]').onclick = () => openCinema(list, i + 1);
    overlay.onclick = (ev) => { if (ev.target === overlay) close(); };
  }

  function bindGallery(root, vehicles, opts = {}) {
    if (!root) return;
    const list = vehicles || [];
    root.querySelectorAll('[data-open-gallery]').forEach((btn) => {
      btn.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openStoryViewer(list, Number(btn.getAttribute('data-open-gallery') || 0));
      };
    });
    root.querySelectorAll('.ig-open-story, [data-story-index]').forEach((btn) => {
      if (!btn.classList.contains('ig-open-story') && !btn.hasAttribute('data-story-index')) return;
      btn.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openStoryViewer(list, Number(btn.getAttribute('data-story-index') || 0));
      };
    });
    root.querySelectorAll('[data-cinema-index]').forEach((btn) => {
      btn.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openCinema(list, Number(btn.getAttribute('data-cinema-index') || 0));
      };
    });
    if (opts.onPlatform) {
      root.querySelectorAll('[data-platform]').forEach((btn) => {
        btn.onclick = () => opts.onPlatform(btn.getAttribute('data-platform'));
      });
    }
    if (opts.onVehicle) {
      root.querySelectorAll('[data-vehicle-id]').forEach((el) => {
        el.onclick = (ev) => {
          if (ev.target.closest('a,button')) return;
          opts.onVehicle(Number(el.getAttribute('data-vehicle-id')), Number(el.getAttribute('data-index') || 0));
        };
      });
    }
  }

  function setMode(root, mode) {
    if (!root) return;
    const feed = root.querySelector('[data-feed]');
    const reels = root.querySelector('[data-reels]');
    if (feed) {
      feed.hidden = mode === 'reels';
      feed.classList.toggle('ig-feed--grid', mode === 'grid');
    }
    if (reels) {
      reels.hidden = mode !== 'reels';
      reels.classList.toggle('is-on', mode === 'reels');
    }
  }

  global.NajjarCar3D = {
    accentOf,
    renderCar3D,
    renderIgPost,
    renderReel,
    renderStories,
    renderFeed,
    renderHero,
    openStoryViewer,
    openCinema,
    bindGallery,
    setMode,
    money,
    esc,
  };
})(typeof window !== 'undefined' ? window : globalThis);
