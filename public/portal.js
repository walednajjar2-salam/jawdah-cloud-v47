(function(){
  const params = new URLSearchParams(location.search);
  const token = params.get('t') || params.get('token') || '';
  let data = null;

  const $ = s => document.querySelector(s);
  const fmt = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 3 });
  const money = n => fmt(n) + ' OMR';

  function toast(msg, err) {
    const t = $('#portalToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.toggle('err', !!err);
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3500);
  }

  async function portalApi(path, opts = {}) {
    const res = await fetch('/api/portal/' + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { ok: false, error: text }; }
    if (!res.ok || json.ok === false) throw new Error(json.error || 'Request failed');
    return json;
  }

  function badge(status) {
    const s = String(status || '').toLowerCase();
    return `<span class="badge ${s}">${status || '—'}</span>`;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || '').slice(0, 500000));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function bindTabs() {
    $('#portalTabs')?.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        $('#portalTabs').querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.querySelectorAll('.portal-panel').forEach(p => {
          p.classList.toggle('active', p.dataset.panel === tab);
        });
      };
    });
  }

  function renderAll() {
    if (!data) return;
    const s = data.summary || {};
    const co = data.company || {};
    $('#portalCompanyName').textContent = co.name_ar || co.name_en || 'Quality of Launch';
    $('#portalWelcome').textContent = 'مرحباً، ' + (data.client?.name || '');
    $('#portalBalancePill').textContent = 'المتبقي: ' + money(s.balance || 0);
    if (co.logo_url) {
      $('#portalLogo').src = co.logo_url;
      $('#portalHeaderLogo').src = co.logo_url;
    }
    $('#portalKpis').innerHTML = `
      <div class="portal-kpi"><span>إجمالي الفوترة</span><b>${money(s.billed)}</b></div>
      <div class="portal-kpi"><span>المدفوع</span><b>${money(s.paid)}</b></div>
      <div class="portal-kpi"><span>فواتير مفتوحة</span><b>${fmt(s.open_invoices)}</b></div>`;
    const active = (data.contracts || []).find(c => String(c.status || '').toLowerCase().includes('active'));
    const prop = active ? (data.properties || {})[active.property_id] : null;
    $('#portalQuickInfo').innerHTML = active
      ? `<h3>وحدتك الحالية</h3><p><b>${prop?.name || '—'}</b><br>${prop?.location || ''}<br>العقد ينتهي: ${active.end_date} · الإيجار ${money(active.rent_amount)}</p>`
      : '<p class="mini">لا يوجد عقد نشط حالياً — تواصل مع إدارة العقار.</p>';

    const invRows = (data.invoices || []).map(inv => {
      const rem = Number(inv.amount) - Number(inv.paid_amount);
      return `<tr><td>${inv.invoice_no || inv.id}</td><td>${inv.due_date}</td><td>${money(inv.amount)}</td><td>${money(inv.paid_amount)}</td><td>${money(rem)}</td><td>${badge(inv.status)}</td></tr>`;
    }).join('');
    $('#portalInvoicesList').innerHTML = invRows
      ? `<table class="portal-table"><thead><tr><th>الفاتورة</th><th>الاستحقاق</th><th>الإجمالي</th><th>مدفوع</th><th>متبقي</th><th>الحالة</th></tr></thead><tbody>${invRows}</tbody></table>`
      : '<p class="mini">لا توجد فواتير.</p>';

    const openInv = (data.invoices || []).filter(i => i.status !== 'Paid');
    const sel = $('#proofInvoice');
    if (sel) {
      sel.innerHTML = openInv.map(i => {
        const rem = Number(i.amount) - Number(i.paid_amount);
        return `<option value="${i.id}" data-remaining="${rem}">${i.invoice_no || i.id} — متبقي ${money(rem)}</option>`;
      }).join('') || '<option value="">— لا فواتير مفتوحة —</option>';
      sel.onchange = () => {
        const opt = sel.selectedOptions[0];
        if (opt?.dataset.remaining) $('#proofAmount').value = Number(opt.dataset.remaining).toFixed(3);
      };
      if (openInv.length) sel.dispatchEvent(new Event('change'));
    }

    $('#portalProofsHistory').innerHTML = (data.proofs || []).length
      ? `<table class="portal-table"><thead><tr><th>التاريخ</th><th>المبلغ</th><th>المرجع</th><th>الحالة</th></tr></thead><tbody>${data.proofs.map(p =>
        `<tr><td>${(p.submitted_at || '').slice(0, 10)}</td><td>${money(p.amount)}</td><td>${p.transfer_ref || '—'}</td><td>${badge(p.status)}</td></tr>`
      ).join('')}</tbody></table>`
      : '<p class="mini">لم تُرفع إثباتات بعد.</p>';

    $('#portalPaymentsList').innerHTML = (data.payments || []).length
      ? `<table class="portal-table"><thead><tr><th>التاريخ</th><th>المبلغ</th><th>الطريقة</th><th>ملاحظة</th></tr></thead><tbody>${data.payments.map(p =>
        `<tr><td>${p.payment_date}</td><td>${money(p.amount)}</td><td>${p.method}</td><td>${p.note || '—'}</td></tr>`
      ).join('')}</tbody></table>`
      : '<p class="mini">لا مدفوعات مسجّلة.</p>';

    if (active) {
      $('#portalContractBox').innerHTML = `
        <h3>عقد ${active.contract_no || active.id}</h3>
        <p><b>النوع:</b> ${active.contract_type || '—'}<br>
        <b>البداية:</b> ${active.start_date} · <b>النهاية:</b> ${active.end_date}<br>
        <b>الإيجار:</b> ${money(active.rent_amount)} · <b>التأمين:</b> ${money(active.deposit_amount)}<br>
        <b>الوحدة:</b> ${prop?.name || '—'} — ${prop?.location || ''}<br>
        <b>الحالة:</b> ${badge(active.status)}</p>`;
    } else {
      $('#portalContractBox').innerHTML = '<p class="mini">لا يوجد عقد نشط.</p>';
    }

    $('#portalMaintList').innerHTML = (data.maintenance || []).length
      ? `<table class="portal-table"><thead><tr><th>التاريخ</th><th>العنوان</th><th>الأولوية</th><th>الحالة</th></tr></thead><tbody>${data.maintenance.map(m =>
        `<tr><td>${m.request_date}</td><td>${m.title}</td><td>${m.priority}</td><td>${badge(m.status)}</td></tr>`
      ).join('')}</tbody></table>`
      : '<p class="mini">لا طلبات صيانة.</p>';
  }

  async function loadDashboard() {
    if (!token) {
      $('#portalGateMsg').textContent = 'رابط غير صالح — تواصل مع إدارة العقار للحصول على رابطك الخاص.';
      return;
    }
    try {
      data = await portalApi('dashboard?token=' + encodeURIComponent(token));
      $('#portalGate').classList.add('hidden');
      $('#portalApp').classList.remove('hidden');
      bindTabs();
      renderAll();
    } catch (e) {
      $('#portalGateMsg').textContent = e.message || 'تعذر فتح البوابة';
    }
  }

  $('#portalProofForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const invoice_id = $('#proofInvoice').value;
      if (!invoice_id) return toast('لا توجد فاتورة مفتوحة', true);
      let proof_image = '';
      const file = $('#proofImage')?.files?.[0];
      if (file) proof_image = await readFileAsDataUrl(file);
      await portalApi('submit_proof', {
        method: 'POST',
        body: JSON.stringify({
          token,
          invoice_id,
          amount: Number($('#proofAmount').value),
          transfer_ref: $('#proofRef').value,
          note: $('#proofNote').value,
          proof_image,
        }),
      });
      toast('تم إرسال الإثبات — سيراجعه فريق المحاسبة');
      $('#portalProofForm').reset();
      data = await portalApi('dashboard?token=' + encodeURIComponent(token));
      renderAll();
    } catch (err) { toast(err.message, true); }
  });

  $('#portalMaintForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await portalApi('maintenance', {
        method: 'POST',
        body: JSON.stringify({
          token,
          title: $('#maintTitle').value,
          priority: $('#maintPriority').value,
          notes: $('#maintNotes').value,
        }),
      });
      toast('تم إرسال طلب الصيانة');
      $('#portalMaintForm').reset();
      data = await portalApi('dashboard?token=' + encodeURIComponent(token));
      renderAll();
    } catch (err) { toast(err.message, true); }
  });

  loadDashboard();
})();
