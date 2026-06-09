/* Phase 2 — Renewal engine + cash-flow forecast */
window.RenewalEngine = {
  monthStart(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  },

  monthEnd(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  },

  monthKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  },

  monthlyRent(c) {
    const rent = Number(c.rent_amount || 0);
    const cycle = String(c.payment_cycle || 'monthly').toLowerCase();
    if (cycle.includes('quarter')) return rent / 3;
    if (cycle.includes('year') || cycle.includes('annual')) return rent / 12;
    return rent;
  },

  contractActiveInMonth(c, monthStart, monthEnd) {
    if (!c.start_date || !c.end_date) return false;
    const start = new Date(c.start_date + 'T00:00:00');
    const end = new Date(c.end_date + 'T00:00:00');
    return start <= monthEnd && end >= monthStart;
  },

  build() {
    const data = Jawdah?.data || {};
    const k = Jawdah?.dashboard?.kpis || {};
    const series = Jawdah?.dashboard?.series || [];
    const activeContracts = (data.contracts || []).filter(c =>
      String(c.status || '').toLowerCase().includes('active')
    );
    const renewalItems = typeof renewalQueue === 'function' ? renewalQueue() : [];
    const expiringSet = new Set(renewalItems.map(x => x.contract.id));

    const months = [];
    const anchor = this.monthStart(new Date());
    for (let i = 0; i < 6; i++) {
      const start = new Date(anchor.getFullYear(), anchor.getMonth() + i, 1);
      const end = this.monthEnd(start);
      months.push({ key: this.monthKey(start), label: start.toLocaleDateString('ar-OM', { month: 'long', year: 'numeric' }), start, end });
    }

    const collectionRate = k.billed
      ? Math.min(0.98, Number(k.paid || 0) / Number(k.billed || 1) * 0.92)
      : 0.82;
    const avgExpense = series.length
      ? series.reduce((s, x) => s + Number(x.expense || 0), 0) / series.length
      : Number(k.expense || 0) / 6;

    const scenarios = { baseline: [], optimistic: [], pessimistic: [] };

    months.forEach(m => {
      let baseRent = 0;
      let optRent = 0;
      let pesRent = 0;

      activeContracts.forEach(c => {
        const rent = this.monthlyRent(c);
        const active = this.contractActiveInMonth(c, m.start, m.end);
        if (!active) return;

        if (!expiringSet.has(c.id)) {
          baseRent += rent;
          optRent += rent;
          pesRent += rent;
          return;
        }

        const days = typeof contractDaysLeft === 'function' ? contractDaysLeft(c.end_date) : null;
        const endDate = new Date(c.end_date + 'T00:00:00');
        if (days !== null && days < 0) {
          pesRent += 0;
          baseRent += rent * 0.35;
          optRent += rent;
          return;
        }

        if (endDate >= m.start && endDate <= m.end) {
          const frac = endDate.getDate() / m.end.getDate();
          pesRent += rent * frac;
          baseRent += rent * (0.4 + frac * 0.3);
          optRent += rent;
        } else if (endDate > m.end) {
          baseRent += rent * 0.75;
          optRent += rent;
          pesRent += rent * 0.85;
        }
      });

      const dueInv = (data.invoices || []).filter(inv =>
        String(inv.due_date || '').startsWith(m.key) && inv.status !== 'Paid'
      );
      const openDue = dueInv.reduce(
        (s, inv) => s + Math.max(0, Number(inv.amount || 0) - Number(inv.paid_amount || 0)),
        0
      );
      const collect = openDue * collectionRate;

      const push = (arr, rent, colMul) => {
        const collection = collect * colMul;
        const expense = avgExpense;
        arr.push({ key: m.key, label: m.label, rent, collection, expense, net: rent + collection - expense });
      };

      push(scenarios.baseline, baseRent, 1);
      push(scenarios.optimistic, optRent, 1.08);
      push(scenarios.pessimistic, pesRent, 0.72);
    });

    const recommendations = renewalItems.map(({ contract: c, meta }) => {
      const prop = typeof byId === 'function' ? byId('properties', c.property_id) : {};
      const client = typeof byId === 'function' ? byId('clients', c.client_id) : {};
      const current = Number(c.rent_amount || 0);
      const market = Number(prop.price || current);
      const plus5 = Math.round(current * 1.05 * 1000) / 1000;
      const days = meta.days ?? 999;
      const milestone =
        days < 0 ? 'expired' : days <= 7 ? '7d' : days <= 30 ? '30d' : days <= 60 ? '60d' : '90d';
      const aptNo = typeof aptNoFromProperty === 'function' ? aptNoFromProperty(prop) : '—';
      const recRent = plus5 <= market ? plus5 : market;
      return {
        contract: c,
        meta,
        client,
        property: prop,
        aptNo,
        milestone,
        current,
        market,
        plus5,
        recommendedRent: recRent,
        scenarios: [
          { id: 'same', label: 'إبقاء الإيجار', rent: current, delta6m: 0 },
          { id: 'plus5', label: 'زيادة 5%', rent: plus5, delta6m: (plus5 - current) * 6 },
          { id: 'market', label: 'سعر السوق', rent: market, delta6m: (market - current) * 6 },
          { id: 'vacate', label: 'عدم التجديد', rent: 0, delta6m: -current * 6 },
        ],
      };
    });

    const totals = {
      baseline6m: scenarios.baseline.reduce((s, x) => s + x.net, 0),
      optimistic6m: scenarios.optimistic.reduce((s, x) => s + x.net, 0),
      pessimistic6m: scenarios.pessimistic.reduce((s, x) => s + x.net, 0),
      monthlyBaseline: activeContracts.reduce((s, c) => s + this.monthlyRent(c), 0),
      atRiskMonthly: renewalItems.reduce((s, x) => s + this.monthlyRent(x.contract), 0),
      expiringCount: renewalItems.length,
    };

    return { months, scenarios, recommendations, totals, renewalItems, collectionRate };
  },

  milestoneLabel(m) {
    return (
      { expired: 'منتهٍ — إجراء فوري', '7d': 'تنبيه 7 أيام', '30d': 'تنبيه 30 يوم', '60d': 'تنبيه 60 يوم', '90d': 'تنبيه 90 يوم' }[m] || m
    );
  },

  renewalWaMessage(rec) {
    const c = rec.contract;
    const name = rec.client?.name || 'المستأجر';
    const unit = rec.property?.name || `شقة ${rec.aptNo}`;
    const days = rec.meta?.days ?? 0;
    if (days < 0) {
      return `السلام عليكم ${name}،\nنذكّركم بانتهاء عقد إيجار ${unit} (${c.contract_no || c.id}).\nيرجى التواصل لترتيب التجديد أو تسليم الوحدة.\n— جودة الانطلاقة للخدمات`;
    }
    return `السلام عليكم ${name}،\nعقد إيجار ${unit} ينتهي في ${c.end_date} (بعد ${days} يوم).\nنقترح تجديد العقد بإيجار ${typeof money === 'function' ? money(rec.recommendedRent) : rec.recommendedRent + ' OMR'}.\nللتأكيد ردّوا على هذه الرسالة.\n— جودة الانطلاقة للخدمات`;
  },

  drawChart(canvasId, engine) {
    const c = document.getElementById(canvasId);
    if (!c || !engine) return;
    const r = c.getBoundingClientRect();
    c.width = r.width * devicePixelRatio;
    c.height = r.height * devicePixelRatio;
    const g = c.getContext('2d');
    g.scale(devicePixelRatio, devicePixelRatio);
    const w = r.width;
    const h = r.height;
    g.clearRect(0, 0, w, h);

    const lines = [
      { key: 'optimistic', color: '#86efac' },
      { key: 'baseline', color: '#40e0d0' },
      { key: 'pessimistic', color: '#fca5a5' },
    ];
    const allVals = lines.flatMap(l => engine.scenarios[l.key].map(x => x.net));
    const max = Math.max(...allVals, 1) * 1.15;
    const n = engine.scenarios.baseline.length;
    const pad = 36;

    g.strokeStyle = 'rgba(148,163,184,.15)';
    for (let i = 0; i < 5; i++) {
      const y = pad + i * ((h - pad - 24) / 4);
      g.beginPath();
      g.moveTo(pad, y);
      g.lineTo(w - pad, y);
      g.stroke();
    }

    lines.forEach(line => {
      const pts = engine.scenarios[line.key];
      g.beginPath();
      pts.forEach((p, i) => {
        const x = pad + i * ((w - pad * 2) / Math.max(1, n - 1));
        const y = h - 24 - (p.net / max) * (h - pad - 24);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.strokeStyle = line.color;
      g.lineWidth = 3;
      g.stroke();
    });

    g.fillStyle = 'rgba(148,163,184,.85)';
    g.font = '11px Tajawal';
    g.textAlign = 'center';
    engine.scenarios.baseline.forEach((p, i) => {
      const x = pad + i * ((w - pad * 2) / Math.max(1, n - 1));
      g.fillText(p.key.slice(5), x, h - 6);
    });
  },

  render() {
    const host = document.getElementById('renewalEngineBox');
    if (!host) return;
    const engine = this.build();
    Jawdah.renewalEngine = engine;

    host.innerHTML = `
      <div class="renewal-engine-kpis">
        <div class="renewal-scenario-card baseline"><span>تدفق 6 أشهر — متوقع</span><strong class="dash-count" data-money="1" data-value="${Math.round(engine.totals.baseline6m)}">0</strong></div>
        <div class="renewal-scenario-card optimistic"><span>سيناريو أفضل (تجديد كامل)</span><strong class="dash-count" data-money="1" data-value="${Math.round(engine.totals.optimistic6m)}">0</strong></div>
        <div class="renewal-scenario-card pessimistic"><span>سيناريو حذر (شغور جزئي)</span><strong class="dash-count" data-money="1" data-value="${Math.round(engine.totals.pessimistic6m)}">0</strong></div>
        <div class="renewal-scenario-card risk"><span>إيجار شهري معرّض للخطر</span><strong class="dash-count" data-money="1" data-value="${Math.round(engine.totals.atRiskMonthly)}">0</strong><small class="mini">${engine.totals.expiringCount} عقد</small></div>
      </div>
      <div class="renewal-engine-layout">
        <div class="card glass-float-panel renewal-chart-card">
          <div class="renewal-card-head"><h3>${typeof ic === 'function' ? ic('trending-up', 'title-ic') : ''} التدفق النقدي — 6 أشهر</h3>
            <button class="ghost" onclick="RenewalEngine.downloadPdf()">${typeof ic === 'function' ? ic('file-down') : ''} PDF</button></div>
          <p class="mini">أخضر: تجديد كامل · ترquoise: متوقع · أحمر: شغور جزئي + تحصيل أضعف</p>
          <div class="canvas-wrap renewal-canvas-wrap"><canvas id="renewalForecastChart"></canvas></div>
          <div class="renewal-legend"><span class="leg optimistic">● أفضل</span><span class="leg baseline">● متوقع</span><span class="leg pessimistic">● حذر</span></div>
        </div>
        <div class="card glass-float-panel">
          <h3>${typeof ic === 'function' ? ic('calendar-clock', 'title-ic') : ''} جدول التذكيرات</h3>
          <div class="renewal-milestones">${['expired', '7d', '30d', '60d', '90d'].map(m => {
            const n = engine.recommendations.filter(r => r.milestone === m).length;
            return `<div class="renewal-milestone ${m}"><b>${this.milestoneLabel(m)}</b><span>${n} عقد</span></div>`;
          }).join('')}</div>
        </div>
      </div>
      <div class="card glass-float-panel renewal-decisions-card">
        <div class="renewal-card-head"><h3>${typeof ic === 'function' ? ic('git-compare', 'title-ic') : ''} محرك قرار التجديد</h3></div>
        <p class="mini">قارن: نفس الإيجار · +5% · سعر السوق · عدم التجديد — ثم نفّذ التجديد أو أرسل تذكير واتساب</p>
        <div class="renewal-decision-grid">${engine.recommendations.length ? engine.recommendations.map(rec => `
          <article class="renewal-decision ${rec.meta.tone}">
            <header><div><b>${rec.property?.name || '—'} · ${rec.client?.name || '—'}</b>
              <div class="mini">${rec.contract.contract_no || rec.contract.id} · ينتهي ${rec.contract.end_date} · ${rec.meta.label}</div></div>
              <span class="badge ${rec.meta.tone}">${this.milestoneLabel(rec.milestone)}</span></header>
            <div class="renewal-scenario-row">${rec.scenarios.map(s => `
              <div class="renewal-scenario-pill ${s.id === 'vacate' ? 'vacate' : ''}${s.id === 'plus5' && rec.recommendedRent === rec.plus5 ? ' rec' : ''}${s.id === 'market' && rec.recommendedRent === rec.market ? ' rec' : ''}">
                <span>${s.label}</span><strong>${typeof money === 'function' ? money(s.rent) : s.rent}</strong>
                <small>${s.delta6m >= 0 ? '+' : ''}${typeof money === 'function' ? money(s.delta6m) : s.delta6m} / 6ش</small>
              </div>`).join('')}</div>
            <div class="renewal-decision-actions">
              <button class="gold-btn" onclick="openRenewalDecisionModal('${rec.contract.id}')">${typeof ic === 'function' ? ic('refresh-cw') : ''} تجديد</button>
              ${rec.client?.phone && window.ReminderHub ? `<a class="glass-btn glass-btn-wa" href="${ReminderHub.waUrl(rec.client.phone, RenewalEngine.renewalWaMessage(rec))}" target="_blank" rel="noopener">${typeof ic === 'function' ? ic('message-circle') : ''} واتساب</a>` : ''}
              <button class="ghost" onclick="showSection('contracts')">العقد</button>
            </div>
          </article>`).join('') : `<div class="ecc-empty">${typeof ic === 'function' ? ic('circle-check-big', 'title-ic') : ''} لا عقود تحتاج قرار تجديد الآن — التدفق مستقر</div>`}
        </div>
      </div>`;

    if (typeof animateDashCounts === 'function') animateDashCounts(host);
    if (typeof paintIcons === 'function') paintIcons(host);
    setTimeout(() => this.drawChart('renewalForecastChart', engine), 80);
  },

  forecastHtml(engine) {
    const esc = CompanyProfile?.escapeHtml?.bind(CompanyProfile) || (x => String(x ?? ''));
    const s = CompanyProfile?.settings || {};
    const rows = engine.recommendations.map(rec =>
      `<tr><td>${esc(rec.aptNo)}</td><td>${esc(rec.client?.name)}</td><td>${esc(rec.contract.end_date)}</td><td>${esc(typeof money === 'function' ? money(rec.current) : rec.current)}</td><td>${esc(typeof money === 'function' ? money(rec.recommendedRent) : rec.recommendedRent)}</td><td>${esc(rec.meta.label)}</td></tr>`
    ).join('') || '<tr><td colspan="6">لا عقود للتجديد</td></tr>';
    const flowRows = engine.scenarios.baseline.map((b, i) => {
      const o = engine.scenarios.optimistic[i];
      const p = engine.scenarios.pessimistic[i];
      return `<tr><td>${esc(b.label)}</td><td>${esc(typeof money === 'function' ? money(b.net) : b.net)}</td><td>${esc(typeof money === 'function' ? money(o.net) : o.net)}</td><td>${esc(typeof money === 'function' ? money(p.net) : p.net)}</td></tr>`;
    }).join('');
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
      body{font-family:Tajawal,Arial,sans-serif;padding:24px;background:#fdfbf7;color:#111}
      .qls-doc{max-width:900px;margin:0 auto}
      h1{color:#92400e} table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}
      th,td{border:1px solid #ddd;padding:8px;text-align:right} th{background:#f5efe6}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}
      .kpi{border:1px solid #ddd;padding:12px;border-radius:10px;background:#fff}
    </style></head><body><article class="qls-doc">
      <h1>تقرير محرك التجديد والتدفق النقدي</h1>
      <p>${esc(s.name_ar)} · ${esc(new Date().toLocaleString('ar-OM'))}</p>
      <div class="kpis">
        <div class="kpi"><span>متوقع 6 أشهر</span><b>${esc(typeof money === 'function' ? money(engine.totals.baseline6m) : engine.totals.baseline6m)}</b></div>
        <div class="kpi"><span>أفضل</span><b>${esc(typeof money === 'function' ? money(engine.totals.optimistic6m) : engine.totals.optimistic6m)}</b></div>
        <div class="kpi"><span>حذر</span><b>${esc(typeof money === 'function' ? money(engine.totals.pessimistic6m) : engine.totals.pessimistic6m)}</b></div>
        <div class="kpi"><span>معرّض للخطر</span><b>${esc(typeof money === 'function' ? money(engine.totals.atRiskMonthly) : engine.totals.atRiskMonthly)}</b></div>
      </div>
      <h2>التدفق الشهري</h2>
      <table><thead><tr><th>الشهر</th><th>متوقع</th><th>أفضل</th><th>حذر</th></tr></thead><tbody>${flowRows}</tbody></table>
      <h2>قرارات التجديد</h2>
      <table><thead><tr><th>الشقة</th><th>المستأجر</th><th>النهاية</th><th>الحالي</th><th>المقترح</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody></table>
    </article></body></html>`;
  },

  async downloadPdf() {
    const engine = Jawdah?.renewalEngine || this.build();
    if (typeof downloadHtmlAsPdf !== 'function') return toast('PDF غير متاح', true);
    await downloadHtmlAsPdf(this.forecastHtml(engine), `renewal-forecast-${new Date().toISOString().slice(0, 10)}.pdf`);
  },
};

function renderRenewalEngine() {
  RenewalEngine.render();
}

function openRenewalDecisionModal(contractId) {
  const c = byId('contracts', contractId);
  if (!c.id) return toast('لم يتم العثور على العقد', true);
  const engine = Jawdah.renewalEngine || RenewalEngine.build();
  const rec = engine.recommendations.find(r => r.contract.id === contractId);
  const prop = byId('properties', c.property_id);
  const client = byId('clients', c.client_id);
  const oldStart = c.start_date || today();
  const oldEnd = c.end_date || today();
  const defaultMonths = Math.max(1, Math.round((new Date(oldEnd + 'T00:00:00') - new Date(oldStart + 'T00:00:00')) / (86400000 * 30)));
  const recRent = rec?.recommendedRent ?? Number(c.rent_amount || 0);

  $('#genericModalBody').innerHTML = `
    <h2>تجديد العقد — ${escapeHtml(c.contract_no || c.id)}</h2>
    <p class="mini">${escapeHtml(prop.name || '')} · ${escapeHtml(client.name || '')} · ينتهي ${c.end_date}</p>
    <div class="renewal-modal-scenarios">${(rec?.scenarios || []).map(s => `
      <button type="button" class="renewal-scenario-pick ${s.id === 'plus5' ? 'active' : ''}" data-rent="${s.rent}" onclick="RenewalEngine.pickScenario(this)">
        <span>${s.label}</span><strong>${money(s.rent)}</strong></button>`).join('')}</div>
    <div class="form edit-form">
      <label>مدة التجديد (أشهر)<input id="renewMonths" type="number" min="1" max="120" value="${defaultMonths}"></label>
      <label>الإيجار الشهري الجديد<input id="renewRent" type="number" step="0.001" value="${recRent}"></label>
    </div>
    <div class="toolbar">
      <button class="gold-btn" onclick="submitRenewalDecision('${contractId}')">${ic('refresh-cw')} تأكيد التجديد</button>
      <button class="ghost" onclick="closeModal('genericModal')">إلغاء</button>
    </div>`;
  openModal('genericModal');
  paintIcons($('#genericModalBody'));
}

RenewalEngine.pickScenario = function (btn) {
  document.querySelectorAll('.renewal-scenario-pick').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if ($('#renewRent')) $('#renewRent').value = btn.dataset.rent;
};

async function submitRenewalDecision(contractId) {
  const months = Number($('#renewMonths')?.value || 0);
  const rent = Number($('#renewRent')?.value || 0);
  if (!months || months <= 0) return toast('مدة غير صالحة', true);
  try {
    const payload = { contract_id: contractId, months };
    if (rent > 0) payload.rent_amount = rent;
    const res = await api('renew_contract', { method: 'POST', body: JSON.stringify(payload) });
    closeModal('genericModal');
    toast('تم إنشاء عقد التجديد: ' + (res.contract?.contract_no || res.contract?.id));
    await loadAll();
    showSection('renewal-engine');
  } catch (e) {
    toast(e.message, true);
  }
}

async function renewContract(contractId) {
  openRenewalDecisionModal(contractId);
}
