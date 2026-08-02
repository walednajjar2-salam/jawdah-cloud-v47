/* Client dossier — links needs, viewings, followups, contracts, receipts, maintenance. */
(function () {
  "use strict";

  const LIFE = {
    prospect: "عميل محتمل",
    current_tenant: "مستأجر حالي",
    former_tenant: "مستأجر سابق",
  };

  function esc(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function moneyFmt(n) {
    if (typeof moneyVal === "function") return moneyVal(n);
    if (typeof window.money === "function") return window.money(n);
    return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 3 }) + " OMR";
  }

  function listHtml(items, mapFn, empty) {
    if (!items || !items.length) return `<p class="mini">${empty || "لا توجد سجلات"}</p>`;
    return items.map(mapFn).join("");
  }

  async function openClientDossier(clientId) {
    if (!clientId) return;
    try {
      const res = await api("estate_client_dossier?client_id=" + encodeURIComponent(clientId));
      const c = res.client || {};
      const life = res.lifecycle_label || LIFE[res.lifecycle_status] || "عميل";
      const body = document.getElementById("genericModalBody");
      if (!body) return toastErr("نافذة العرض غير متاحة");

      body.innerHTML = `
        <h2>ملف العميل</h2>
        <p class="mini">${esc(c.name || "")} · ${esc(c.phone || "—")} · <span class="badge">${esc(life)}</span></p>
        <div class="status-line" style="margin-bottom:12px">
          <span class="badge">هوية ${esc(c.national_id || "—")}</span>
          <span class="badge">جنسية ${esc(c.nationality || "—")}</span>
          <span class="badge">بريد ${esc(c.email || "—")}</span>
          <span class="badge">عنوان ${esc(c.address || "—")}</span>
        </div>
        <div class="toolbar" id="lqDossierTabs">
          <button type="button" class="gold-btn" data-dt="overview">نظرة عامة</button>
          <button type="button" class="ghost" data-dt="needs">الاحتياج</button>
          <button type="button" class="ghost" data-dt="viewings">المعاينات</button>
          <button type="button" class="ghost" data-dt="followups">المتابعات</button>
          <button type="button" class="ghost" data-dt="contracts">العقود</button>
          <button type="button" class="ghost" data-dt="receipts">السندات</button>
          <button type="button" class="ghost" data-dt="maint">الصيانة</button>
        </div>
        <div id="lqDossierPane"></div>
        <div class="toolbar" style="margin-top:14px">
          <button type="button" class="ghost" onclick="clientStatement('${esc(c.id)}')">كشف حساب</button>
          <button type="button" class="ghost" onclick="editRecord('clients','${esc(c.id)}')">تعديل بيانات</button>
          <button type="button" class="ghost" onclick="closeModal('genericModal')">إغلاق</button>
        </div>`;

      const pane = document.getElementById("lqDossierPane");
      const paint = (tab) => {
        document.querySelectorAll("#lqDossierTabs [data-dt]").forEach((b) => {
          b.className = b.getAttribute("data-dt") === tab ? "gold-btn" : "ghost";
        });
        if (tab === "overview") {
          pane.innerHTML = `
            <div class="executive-strip" style="margin-top:10px">
              <div class="executive-chip"><b>عقود عقارية</b><br><span class="mini">${(res.estate_contracts || []).length}</span></div>
              <div class="executive-chip"><b>عقود تقليدية</b><br><span class="mini">${(res.legacy_contracts || []).length}</span></div>
              <div class="executive-chip"><b>وحدات مرتبطة</b><br><span class="mini">${(res.units || []).length}</span></div>
              <div class="executive-chip"><b>سندات قبض</b><br><span class="mini">${(res.receipts || []).length}</span></div>
            </div>
            <h3 style="margin-top:14px">الوحدات</h3>
            ${listHtml(
              res.units,
              (u) =>
                `<div class="statement-row"><span><b>${esc(u.name || u.id)}</b> · ${esc(u.entity_type === "room" ? "غرفة" : "شقة")}</span><b>${esc(u.status || "")}</b></div>`,
              "لا وحدات مرتبطة"
            )}`;
        } else if (tab === "needs") {
          pane.innerHTML =
            listHtml(
              res.needs,
              (n) =>
                `<div class="statement-row"><span><b>${esc(n.need_type || "احتياج")}</b><br><small>${esc(n.location_pref || "")} · غرف ${esc(n.rooms || "—")} · ميزانية ${esc(n.budget_min || 0)}–${esc(n.budget_max || 0)}</small></span><b>${esc(n.status || "")}</b></div>`,
              "لا احتياجات مسجّلة"
            ) +
            `<div class="toolbar" style="margin-top:10px"><button type="button" class="gold-btn" id="lqAddNeed">إضافة احتياج</button></div>`;
          document.getElementById("lqAddNeed")?.addEventListener("click", () => addNeed(clientId));
        } else if (tab === "viewings") {
          pane.innerHTML =
            listHtml(
              res.viewings,
              (v) =>
                `<div class="statement-row"><span><b>${esc(v.viewing_at || "—")}</b><br><small>${esc(v.entity_type || "")} ${esc(v.entity_id || "")}</small></span><b>${esc(v.status || "")}</b></div>`,
              "لا معاينات"
            ) +
            `<div class="toolbar" style="margin-top:10px"><button type="button" class="gold-btn" id="lqAddView">جدولة معاينة</button></div>`;
          document.getElementById("lqAddView")?.addEventListener("click", () => addViewing(clientId));
        } else if (tab === "followups") {
          pane.innerHTML =
            listHtml(
              res.followups,
              (f) =>
                `<div class="statement-row"><span><b>${esc(f.subject || f.channel || "متابعة")}</b><br><small>${esc(f.followup_at || "")} · ${esc(f.notes || "")}</small></span><b>${esc(f.status || "")}</b></div>`,
              "لا متابعات"
            ) +
            `<div class="toolbar" style="margin-top:10px"><button type="button" class="gold-btn" id="lqAddFollow">إضافة متابعة</button></div>`;
          document.getElementById("lqAddFollow")?.addEventListener("click", () => addFollowup(clientId));
        } else if (tab === "contracts") {
          const all = [...(res.estate_contracts || []).map((x) => ({ ...x, _src: "عقاري" })), ...(res.legacy_contracts || []).map((x) => ({ ...x, _src: "تقليدي" }))];
          pane.innerHTML = listHtml(
            all,
            (ct) =>
              `<div class="statement-row"><span><b>${esc(ct.contract_no || ct.id)}</b> · ${esc(ct._src)}<br><small>${esc(ct.start_date || "")} → ${esc(ct.end_date || "")}</small></span><b>${esc(ct.status || "")}</b></div>`,
            "لا عقود"
          );
        } else if (tab === "receipts") {
          pane.innerHTML = listHtml(
            res.receipts,
            (r) =>
              `<div class="statement-row"><span><b>${esc(r.receipt_no || r.id)}</b><br><small>${esc(r.receipt_date || "")} · ${esc(r.method || "")}</small></span><b>${moneyFmt(r.amount)}</b></div>`,
            "لا سندات قبض"
          );
        } else if (tab === "maint") {
          pane.innerHTML = listHtml(
            res.maintenance,
            (m) =>
              `<div class="statement-row"><span><b>${esc(m.title || m.id)}</b><br><small>${esc(m.maintenance_date || "")}</small></span><b>${esc(m.status || "")}</b></div>`,
            "لا صيانة مرتبطة"
          );
        }
      };

      document.getElementById("lqDossierTabs")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-dt]");
        if (btn) paint(btn.getAttribute("data-dt"));
      });
      paint("overview");
      openModal("genericModal");
    } catch (e) {
      if (typeof toastErr === "function") toastErr(e);
      else if (typeof toastBad === "function") toastBad(e);
    }
  }

  async function addNeed(clientId) {
    const need_type = prompt("نوع الاحتياج (سكني / تجاري / غرفة…)", "سكني");
    if (need_type === null) return;
    const budget_max = Number(prompt("الحد الأعلى للميزانية (OMR)", "200") || 0);
    const rooms = prompt("عدد الغرف المطلوب", "2") || "";
    const location_pref = prompt("تفضيل الموقع", "نزوى") || "";
    try {
      await api("client_needs", {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          need_type,
          budget_min: 0,
          budget_max,
          rooms,
          location_pref,
          status: "open",
          notes: "",
        }),
      });
      toastOk("تم الحفظ بنجاح");
      await loadAll();
      openClientDossier(clientId);
    } catch (e) {
      toastErr(e);
    }
  }

  async function addViewing(clientId) {
    const viewing_at = prompt("موعد المعاينة (YYYY-MM-DD أو مع الوقت)", new Date().toISOString().slice(0, 10));
    if (!viewing_at) return;
    const notes = prompt("ملاحظات المعاينة", "") || "";
    try {
      await api("client_viewings", {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          viewing_at,
          status: "scheduled",
          notes,
        }),
      });
      toastOk("تم الحفظ بنجاح");
      await loadAll();
      openClientDossier(clientId);
    } catch (e) {
      toastErr(e);
    }
  }

  async function addFollowup(clientId) {
    const subject = prompt("موضوع المتابعة", "اتصال");
    if (subject === null) return;
    const channel = prompt("القناة (هاتف / واتساب / حضور)", "هاتف") || "هاتف";
    const notes = prompt("ملاحظات", "") || "";
    try {
      await api("client_followups", {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          followup_at: new Date().toISOString().slice(0, 10),
          channel,
          subject,
          status: "open",
          notes,
        }),
      });
      toastOk("تم الحفظ بنجاح");
      await loadAll();
      openClientDossier(clientId);
    } catch (e) {
      toastErr(e);
    }
  }

  window.openClientDossier = openClientDossier;
})();
