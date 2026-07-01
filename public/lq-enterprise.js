(function () {
  "use strict";

  function esc(s) {
    if (typeof htmlEscape === "function") return htmlEscape(s);
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function guide() {
    return `
      <div class="card lq-enterprise-guide">
        <h3>🏛️ التوسع المؤسسي — المرحلة 10</h3>
        <p class="mini">فروع متعددة، سجل تدقيق كامل، API موثّق، ونسخ احتياطي خارج السيرفر.</p>
        <ul class="check-list">
          <li><strong>الفروع</strong> — ربط العقارات بمواقع/بنايات</li>
          <li><strong>التدقيق</strong> — كل إجراء مسجّل مع المستخدم والوقت</li>
          <li><strong>API</strong> — <a href="/docs.html" target="_blank" rel="noopener">Swagger UI</a> · <code>/api/openapi.json</code></li>
          <li><strong>Off-site</strong> — فعّل <code>LQ_OFFSITE_BACKUP_URL</code> على Railway</li>
          <li><strong>PostgreSQL</strong> — مخطط مستقبلي (<code>LQ_DATABASE_URL</code>) — SQLite فعّال الآن</li>
        </ul>
      </div>`;
  }

  function branchForm() {
    return `
      <div class="card" style="margin-top:12px">
        <h4>إضافة فرع / موقع</h4>
        <div class="form">
          <input id="brCode" placeholder="رمز الفرع · HQ">
          <input id="brName" placeholder="اسم الفرع">
          <input id="brCity" placeholder="المدينة">
          <input id="brAddress" placeholder="العنوان">
          <input id="brManager" placeholder="المسؤول">
          <textarea id="brNotes" placeholder="ملاحظات"></textarea>
        </div>
        <button type="button" class="gold-btn" onclick="LQ_ENTERPRISE.saveBranch()">حفظ الفرع</button>
      </div>`;
  }

  function renderBranches(branches) {
    if (!branches || !branches.length) return "<p class=\"mini\">لا فروع — أضف فرعاً أو سيتم إنشاؤها من البنايات تلقائياً</p>";
    return `<div class="table-wrap"><table><thead><tr><th>الرمز</th><th>الاسم</th><th>المدينة</th><th>وحدات</th><th>إشغال</th><th>الحالة</th></tr></thead><tbody>${branches
      .map(
        (b) =>
          `<tr><td>${esc(b.code)}</td><td><b>${esc(b.name)}</b></td><td>${esc(b.city || "—")}</td><td>${b.properties || 0}</td><td>${b.occupancy || 0}%</td><td>${b.active ? "نشط" : "موقوف"}</td></tr>`
      )
      .join("")}</tbody></table></div>`;
  }

  function renderAudit(events) {
    if (!events || !events.length) return "<p class=\"mini\">لا أحداث في السجل</p>";
    return `<div class="saas-task-list">${events
      .map(
        (e) =>
          `<div class="saas-task-item"><div><b>${esc(e.action)}</b> · ${esc(e.entity)}<p class="mini">${esc(e.username || "—")} · ${esc(e.created_at || "")}</p><p>${esc(e.details || "")}</p></div><span class="badge">${esc(e.entity_id || "")}</span></div>`
      )
      .join("")}</div>`;
  }

  function render(host, status, auditRes) {
    if (!host) return;
    const off = status.offsite || {};
    const db = status.database || {};
    host.innerHTML =
      guide() +
      `<div class="status-line" style="margin:8px 0">
        <span class="badge">فروع: ${(status.branches || []).length}</span>
        <span class="badge">تدقيق اليوم: ${status.audit_today || 0}</span>
        <span class="badge">إجمالي التدقيق: ${status.audit_total || 0}</span>
        <span class="badge">${db.engine || "sqlite"}</span>
        <span class="badge">Off-site: ${off.enabled ? "مفعّل" : "غير مفعّل"}</span>
      </div>` +
      `<div class="toolbar" style="flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <button type="button" class="gold-btn" onclick="LQ_ENTERPRISE.refresh()">تحديث</button>
        <a class="ghost" href="/docs.html" target="_blank" rel="noopener">فتح Swagger API</a>
        <button type="button" class="ghost" onclick="showSection('backup')">النسخ الاحتياطي</button>
      </div>` +
      `<div class="layout">
        <div class="card"><h4>الفروع والمباني</h4>${renderBranches(status.branches)}${branchForm()}</div>
        <div class="card"><h4>سجل التدقيق</h4>
          <div class="toolbar" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">
            <input id="auditFilterEntity" placeholder="entity: invoices" style="min-width:120px">
            <input id="auditFilterUser" placeholder="username">
            <button type="button" class="ghost" onclick="LQ_ENTERPRISE.loadAudit()">بحث</button>
          </div>
          ${renderAudit((auditRes && auditRes.events) || [])}
        </div>
      </div>` +
      `<div class="card" style="margin-top:12px"><h4>التكامل والنسخ الخارجي</h4>
        <p class="mini">Off-site: ${off.last_push || "لم يُرسل بعد"} · ${off.last_status && off.last_status.ok ? "آخر دفع ناجح" : esc(off.last_status && off.last_status.error || "—")}</p>
        <p class="mini">PostgreSQL: ${db.postgres_url_configured ? "مُعرّف (قريباً)" : "SQLite نشط"}</p>
      </div>`;
    if (typeof ensureEnglishDigits === "function") ensureEnglishDigits(host);
  }

  async function loadAudit() {
    const entity = (document.getElementById("auditFilterEntity") || {}).value || "";
    const username = (document.getElementById("auditFilterUser") || {}).value || "";
    const q = new URLSearchParams({ limit: "120" });
    if (entity) q.set("entity", entity.trim());
    if (username) q.set("username", username.trim());
    return api("audit_feed?" + q.toString());
  }

  async function refresh() {
    const host = document.getElementById("enterpriseBox");
    if (host) host.innerHTML = "<p class=\"mini\">جاري تحميل التوسع المؤسسي…</p>";
    try {
      const status = await api("enterprise_status");
      const auditRes = await loadAudit();
      render(host, status, auditRes);
      return status;
    } catch (e) {
      if (host) host.innerHTML = guide() + "<p class=\"badge overdue\">تعذر التحميل</p>";
      if (typeof toastErr === "function") toastErr(e);
      throw e;
    }
  }

  async function saveBranch() {
    const code = (document.getElementById("brCode") || {}).value || "";
    const name = (document.getElementById("brName") || {}).value || "";
    if (!code.trim() || !name.trim()) {
      if (typeof toastNotice === "function") toastNotice("رمز الفرع والاسم مطلوبان");
      return;
    }
    try {
      await api("branches", {
        method: "POST",
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          city: (document.getElementById("brCity") || {}).value || "",
          address: (document.getElementById("brAddress") || {}).value || "",
          manager: (document.getElementById("brManager") || {}).value || "",
          notes: (document.getElementById("brNotes") || {}).value || "",
          active: 1,
        }),
      });
      if (typeof toast === "function") toast("تم حفظ الفرع");
      await refresh();
      if (typeof loadAll === "function") await loadAll();
    } catch (e) {
      if (typeof toastErr === "function") toastErr(e);
    }
  }

  window.LQ_ENTERPRISE = { refresh, loadAudit, saveBranch, render };
})();
