/**
 * منصة العقارات — الشجرة الوظيفية الكاملة
 * قائمة رئيسية قصيرة + تفاصيل متدرجة + صلاحيات حسب الدور
 */
(function () {
  "use strict";

  const LS = "lq_estate_tree_v1";
  const SECTIONS = [
    { id: "home", label: "لوحة العقارات", icon: "layout-dashboard", perm: null },
    { id: "command", label: "مركز القيادة", icon: "gauge", perm: "command" },
    { id: "employee", label: "لوحتي", icon: "user-round", perm: null },
    { id: "properties", label: "العقارات", icon: "building-2", perm: "estate_properties:read" },
    { id: "clients", label: "العملاء", icon: "users", perm: "clients" },
    { id: "reservations", label: "الحجوزات", icon: "calendar-check", perm: "estate_apartments:read" },
    { id: "contracts", label: "العقود/فواتير", icon: "file-text", perm: "estate_actions_contract_create" },
    { id: "collection", label: "التحصيل", icon: "wallet", perm: "collection" },
    { id: "overdue", label: "المتأخرات", icon: "circle-alert", perm: "collection" },
    { id: "maintenance", label: "الصيانة", icon: "wrench", perm: "estate_maintenance:read" },
    { id: "workflows", label: "مسارات العمل", icon: "git-branch", perm: "workflows" },
    { id: "files", label: "الملفات", icon: "folder-open", perm: "files" },
    { id: "archive", label: "الأرشيف", icon: "archive", perm: "archive" },
    { id: "approvals", label: "الاعتمادات", icon: "badge-check", perm: "approvals" },
    { id: "reports", label: "التقارير", icon: "bar-chart-3", perm: "reports" },
    { id: "alerts", label: "التنبيهات", icon: "bell", perm: null },
    { id: "settings", label: "إعدادات العقارات", icon: "settings-2", perm: "settings" },
  ];
  const navHistory = [];

  const HERITAGE_NIZWA = { lat: 22.9335, lng: 57.5318, zoom: 15 };
  let estateTreeMap = null;
  let estateTreeMarkers = null;

  const state = {
    section: "home",
    sub: "",
    tab: "overview",
    buildingId: "",
    unitKey: "",
    clientId: "",
    contractId: "",
    approvalId: "",
    searchQ: "",
    moreOpen: "",
    mounted: false,
  };

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS) || "{}");
      Object.assign(state, {
        section: raw.section || "home",
        sub: raw.sub || "",
        tab: raw.tab || "overview",
        buildingId: raw.buildingId || "",
        unitKey: raw.unitKey || "",
        clientId: raw.clientId || "",
        contractId: raw.contractId || "",
        searchQ: raw.searchQ || "",
      });
    } catch (_) {}
  }
  function saveState() {
    try {
      localStorage.setItem(
        LS,
        JSON.stringify({
          section: state.section,
          sub: state.sub,
          tab: state.tab,
          buildingId: state.buildingId,
          unitKey: state.unitKey,
          clientId: state.clientId,
          contractId: state.contractId,
          searchQ: state.searchQ,
        })
      );
    } catch (_) {}
  }

  function esc(v) {
    if (typeof htmlEscape === "function") return htmlEscape(String(v ?? ""));
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function rows(k) {
    return Array.isArray(Jawdah?.data?.[k]) ? Jawdah.data[k] : [];
  }
  function byId(table, id) {
    return rows(table).find((x) => String(x.id) === String(id)) || {};
  }
  function moneyVal(n) {
    return typeof money === "function" ? money(n) : Number(n || 0).toFixed(3);
  }
  function fmtVal(n) {
    return typeof fmt === "function" ? fmt(n) : String(Number(n || 0));
  }
  function todayStr() {
    return typeof today === "function" ? today() : new Date().toISOString().slice(0, 10);
  }
  function role() {
    return String(Jawdah?.user?.role || "").toLowerCase();
  }
  function uname() {
    return String(Jawdah?.user?.username || "")
      .trim()
      .toLowerCase();
  }

  /** صلاحيات أقسام الشجرة حسب الدور */
  function canSection(id) {
    const r = role();
    const u = uname();
    if (typeof OWNER_USERNAMES !== "undefined" && OWNER_USERNAMES.has?.(u)) return true;
    if (["owner", "admin", "deputy"].includes(r)) return true;
    if (id === "home" || id === "alerts" || id === "employee") return true;
    if (id === "command") return ["owner", "admin", "deputy", "manager", "accountant", "operations"].includes(r);
    if (id === "workflows") return ["owner", "admin", "deputy", "manager", "operations", "accountant"].includes(r);
    if (id === "archive") return ["owner", "admin", "deputy", "manager", "accountant"].includes(r);
    if (id === "settings") return ["owner", "admin", "deputy", "manager"].includes(r);
    if (id === "approvals") {
      return typeof canSeeApprovals === "function" ? canSeeApprovals() : ["manager", "accountant", "operations"].includes(r);
    }
    if (id === "collection" || id === "overdue") {
      return ["accountant", "manager", "operations", "reception"].includes(r) || (typeof canSeeFinance === "function" && canSeeFinance());
    }
    if (id === "reports") return ["manager", "accountant", "operations", "viewer"].includes(r);
    if (id === "files") return ["manager", "accountant", "operations", "reception", "maintenance"].includes(r);
    if (id === "maintenance") {
      return typeof hasEstatePermission === "function"
        ? hasEstatePermission("estate_maintenance:read") || hasEstatePermission("estate_maintenance")
        : true;
    }
    if (id === "contracts") {
      return (
        (typeof canEstateCreateContract === "function" && canEstateCreateContract()) ||
        ["manager", "accountant", "operations"].includes(r)
      );
    }
    if (id === "clients") return ["manager", "operations", "reception", "accountant", "viewer"].includes(r);
    if (id === "properties" || id === "reservations") {
      return typeof hasEstatePermission === "function"
        ? hasEstatePermission("estate_buildings:read") || hasEstatePermission("estate_buildings")
        : true;
    }
    return true;
  }

  function canAct(act) {
    const r = role();
    const u = uname();
    if (typeof OWNER_USERNAMES !== "undefined" && OWNER_USERNAMES.has?.(u)) return true;
    if (["owner", "admin", "deputy"].includes(r)) return true;
    switch (act) {
      case "add_client":
        return ["operations", "reception", "manager"].includes(r);
      case "add_building":
      case "add_unit":
        return typeof hasEstatePermission === "function"
          ? hasEstatePermission("estate_buildings") || hasEstatePermission("estate_apartments")
          : ["operations", "manager"].includes(r);
      case "create_reservation":
        return typeof canEstateConvertReservation === "function"
          ? canEstateConvertReservation()
          : ["operations", "reception", "manager"].includes(r);
      case "create_contract":
        return typeof canEstateCreateContract === "function" ? canEstateCreateContract() : ["operations", "manager"].includes(r);
      case "pay":
        return ["accountant", "operations", "manager", "reception"].includes(r);
      case "maint":
        return typeof hasEstatePermission === "function"
          ? hasEstatePermission("estate_maintenance")
          : ["operations", "maintenance", "manager"].includes(r);
      case "decide":
        return typeof canDecideApprovals === "function" ? canDecideApprovals() : ["manager"].includes(r);
      case "activate":
        return typeof canActivateContracts === "function" ? canActivateContracts() : false;
      case "pricing":
        return typeof canEstatePricingEdit === "function" ? canEstatePricingEdit() : false;
      case "closed_edit":
        return ["owner", "admin", "deputy", "manager"].includes(r);
      case "print_doc":
      case "preview_doc":
        return true;
      case "edit_doc":
        return ["owner", "admin", "deputy", "manager", "operations", "accountant"].includes(r);
      case "delete_doc":
        return ["owner", "admin", "deputy"].includes(r);
      case "hide_pdf":
        return true;
      case "archive":
      case "unarchive":
        return ["owner", "admin", "deputy", "manager"].includes(r);
      case "settings_edit":
        return ["owner", "admin", "deputy", "manager"].includes(r);
      default:
        return false;
    }
  }

  function snapshotNav() {
    return {
      section: state.section,
      sub: state.sub,
      tab: state.tab,
      buildingId: state.buildingId,
      unitKey: state.unitKey,
      clientId: state.clientId,
      contractId: state.contractId,
      approvalId: state.approvalId,
      searchQ: state.searchQ,
    };
  }

  function goBack() {
    const prev = navHistory.pop();
    if (!prev) {
      go("home", { clearDetail: true, _skipHist: true });
      return;
    }
    Object.assign(state, prev);
    saveState();
    render();
    if (window.LQ_ESTATE_OPS && typeof LQ_ESTATE_OPS.onNav === "function") LQ_ESTATE_OPS.onNav(state);
  }

  function go(section, opts) {
    opts = opts || {};
    if (!canSection(section)) {
      if (typeof toastErr === "function") toastErr("لا تملك صلاحية هذا القسم");
      return;
    }
    if (!opts._skipHist && state.mounted) {
      const snap = snapshotNav();
      if (snap.section !== section || snap.contractId || snap.buildingId || snap.unitKey || snap.clientId) {
        navHistory.push(snap);
        if (navHistory.length > 40) navHistory.shift();
      }
    }
    state.section = section;
    state.sub = opts.sub != null ? opts.sub : "";
    state.tab = opts.tab || "overview";
    if (opts.buildingId != null) state.buildingId = opts.buildingId;
    if (opts.unitKey != null) state.unitKey = opts.unitKey;
    if (opts.clientId != null) state.clientId = opts.clientId;
    if (opts.contractId != null) state.contractId = opts.contractId;
    if (opts.approvalId != null) state.approvalId = opts.approvalId;
    if (opts.clearDetail) {
      state.buildingId = "";
      state.unitKey = "";
      state.clientId = "";
      state.contractId = "";
      state.approvalId = "";
    }
    state.moreOpen = "";
    saveState();
    render();
  }

  function allUnits() {
    const apts = rows("estate_apartments").map((r) => ({
      ...r,
      entityType: "apartment",
      entityId: r.id,
      kindLabel: "شقة",
    }));
    const rooms = rows("estate_rooms").map((r) => ({
      ...r,
      entityType: "room",
      entityId: r.id,
      kindLabel: "غرفة",
    }));
    return apts.concat(rooms);
  }
  function unitStatus(u) {
    return String(u.status || "").toLowerCase();
  }
  function statusAr(s) {
    const v = String(s || "").toLowerCase();
    if (v === "occupied" || v === "rented") return "مؤجرة";
    if (v === "reserved") return "محجوزة";
    if (v === "maintenance") return "صيانة";
    if (v === "suspended") return "موقوفة";
    if (v === "draft") return "مسودة";
    return "شاغرة";
  }
  function statusTone(s) {
    const v = String(s || "").toLowerCase();
    if (v === "occupied" || v === "rented") return "ok";
    if (v === "reserved") return "warn";
    if (v === "maintenance" || v === "suspended") return "bad";
    return "";
  }
  function contractStatusAr(s) {
    const v = String(s || "").toLowerCase();
    const map = {
      draft: "مسودة",
      approvalrequested: "بانتظار الاعتماد",
      approved: "معتمد",
      active: "فعال",
      rejected: "مرفوض",
      ended: "منتهٍ",
      cancelled: "ملغى",
      canceled: "ملغى",
      renewed: "مجدد",
    };
    return map[v] || s || "—";
  }

  function portfolioStats() {
    const blds = rows("estate_buildings");
    const units = allUnits();
    const occupied = units.filter((u) => ["occupied", "rented"].includes(unitStatus(u))).length;
    const vacant = units.filter((u) => ["vacant", "available", ""].includes(unitStatus(u)) || unitStatus(u) === "draft").length;
    const reserved = units.filter((u) => unitStatus(u) === "reserved").length;
    const maint = units.filter((u) => unitStatus(u) === "maintenance").length;
    const suspended = units.filter((u) => unitStatus(u) === "suspended").length;
    const total = units.length;
    const occPct = total ? Math.round((occupied / total) * 1000) / 10 : 0;
    return { buildings: blds.length, total, occupied, vacant, reserved, maint, suspended, occPct };
  }

  function buildingStats(bldId) {
    const units = allUnits().filter((u) => String(u.building_id) === String(bldId));
    const occupied = units.filter((u) => ["occupied", "rented"].includes(unitStatus(u))).length;
    const vacant = units.filter((u) => unitStatus(u) === "vacant" || unitStatus(u) === "available" || !unitStatus(u)).length;
    const reserved = units.filter((u) => unitStatus(u) === "reserved").length;
    const maint = units.filter((u) => unitStatus(u) === "maintenance").length;
    const suspended = units.filter((u) => unitStatus(u) === "suspended").length;
    const total = units.length;
    const occPct = total ? Math.round((occupied / total) * 1000) / 10 : 0;
    const expected = units.reduce((s, u) => s + Number(u.rent_price || 0), 0);
    const current = units
      .filter((u) => ["occupied", "rented"].includes(unitStatus(u)))
      .reduce((s, u) => s + Number(u.rent_price || 0), 0);
    return { units, total, occupied, vacant, reserved, maint, suspended, occPct, expected, current };
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const d = new Date(String(dateStr).slice(0, 10) + "T00:00:00");
    if (Number.isNaN(d.getTime())) return null;
    const t = new Date(todayStr() + "T00:00:00");
    return Math.round((d - t) / 86400000);
  }

  function needsAttention() {
    const items = [];
    const t = todayStr();
    rows("estate_contracts").forEach((c) => {
      const st = String(c.status || "").toLowerCase();
      const left = daysUntil(c.end_date);
      if (st === "active" && left != null && left >= 0 && left <= 30) {
        items.push({ tone: "warn", title: "عقد قارب على الانتهاء", detail: `${c.contract_no || c.id} · ${left} يوم`, go: () => go("contracts", { sub: "expiring", contractId: c.id }) });
      }
      if (st === "active" && left != null && left < 0) {
        items.push({ tone: "bad", title: "عقد منتهٍ", detail: c.contract_no || c.id, go: () => go("contracts", { sub: "ended", contractId: c.id }) });
      }
      if (st === "approvalrequested") {
        items.push({ tone: "warn", title: "اعتماد عقد معلّق", detail: c.contract_no || c.id, go: () => go("approvals", { sub: "pending" }) });
      }
      if (st === "rejected") {
        items.push({ tone: "bad", title: "عقد معاد للتعديل", detail: c.contract_no || c.id, go: () => go("contracts", { sub: "rejected", contractId: c.id }) });
      }
    });
    allUnits()
      .filter((u) => unitStatus(u) === "reserved")
      .forEach((u) => {
        const left = daysUntil(u.reservation_end_date);
        if (left != null && left >= 0 && left <= 7) {
          items.push({ tone: "warn", title: "حجز قارب على الانتهاء", detail: u.name || u.id, go: () => go("reservations", { sub: "expiring", unitKey: `${u.entityType}:${u.entityId}` }) });
        }
      });
    rows("estate_contract_invoices").forEach((inv) => {
      if (String(inv.status || "").toLowerCase() === "paid") return;
      if (String(inv.due_date || "") < t) {
        items.push({
          tone: "bad",
          title: "دفعة متأخرة",
          detail: `${inv.invoice_no || inv.id} · متبقي ${moneyVal(Math.max(0, Number(inv.amount || 0) - Number(inv.paid_amount || 0)))}`,
          go: () => go("overdue", { sub: "all" }),
        });
      }
    });
    rows("estate_maintenance")
      .filter((m) => !String(m.status || "").toLowerCase().includes("closed") && !String(m.status || "").toLowerCase().includes("done"))
      .slice(0, 8)
      .forEach((m) => {
        items.push({ tone: "warn", title: "صيانة مفتوحة", detail: m.title || m.id, go: () => go("maintenance", { sub: "open" }) });
      });
    const pendingAppr = rows("approvals").filter((a) => String(a.status || "").toLowerCase() === "pending");
    pendingAppr.slice(0, 5).forEach((a) => {
      items.push({ tone: "warn", title: "اعتماد معلّق", detail: a.request_type || a.id, go: () => go("approvals", { sub: "pending", approvalId: a.id }) });
    });
    return items.slice(0, 20);
  }

  function recentOps() {
    const out = [];
    const contracts = rows("estate_contracts").slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    if (contracts[0]) out.push({ title: "آخر عقد", detail: `${contracts[0].contract_no || contracts[0].id} · ${contractStatusAr(contracts[0].status)}`, go: () => go("contracts", { contractId: contracts[0].id }) });
    const inv = rows("estate_contract_invoices").slice().sort((a, b) => String(b.issued_at || b.due_date || "").localeCompare(String(a.issued_at || a.due_date || "")));
    if (inv[0]) out.push({ title: "آخر دفعة/فاتورة", detail: inv[0].invoice_no || inv[0].id, go: () => go("collection", {}) });
    const clients = rows("clients").slice().reverse();
    if (clients[0]) out.push({ title: "آخر عميل", detail: clients[0].name || clients[0].id, go: () => go("clients", { clientId: clients[0].id }) });
    const reserved = allUnits()
      .filter((u) => unitStatus(u) === "reserved")
      .slice()
      .sort((a, b) => String(b.reservation_start_date || "").localeCompare(String(a.reservation_start_date || "")));
    if (reserved[0]) out.push({ title: "آخر حجز", detail: reserved[0].name || reserved[0].id, go: () => go("reservations", { unitKey: `${reserved[0].entityType}:${reserved[0].entityId}` }) });
    const maint = rows("estate_maintenance").slice().sort((a, b) => String(b.maintenance_date || "").localeCompare(String(a.maintenance_date || "")));
    if (maint[0]) out.push({ title: "آخر صيانة", detail: maint[0].title || maint[0].id, go: () => go("maintenance", {}) });
    const appr = rows("approvals").slice().sort((a, b) => String(b.requested_at || b.approved_at || "").localeCompare(String(a.requested_at || a.approved_at || "")));
    if (appr[0]) out.push({ title: "آخر اعتماد", detail: `${appr[0].request_type || ""} · ${appr[0].status || ""}`, go: () => go("approvals", {}) });
    return out;
  }

  function actionBtn(label, onClickAttr, cls) {
    return `<button type="button" class="${cls || "ghost"}" data-act="${esc(onClickAttr)}">${esc(label)}</button>`;
  }

  function moreMenu(id, items) {
    if (!items.length) return "";
    const primary = items.slice(0, 2);
    const rest = items.slice(2);
    let html = primary.map((x) => actionBtn(x.label, x.act, x.cls || "ghost")).join("");
    if (rest.length) {
      html += `<span class="more-wrap"><button type="button" class="ghost" data-more="${esc(id)}">المزيد</button>
        <div class="lq-et-more ${state.moreOpen === id ? "open" : ""}" id="etMore-${esc(id)}">
          ${rest.map((x) => `<button type="button" data-act="${esc(x.act)}">${esc(x.label)}</button>`).join("")}
        </div></span>`;
    }
    return `<div class="lq-et-actions">${html}</div>`;
  }

  function shellHtml() {
    return `
<div class="lq-et" id="lqEstateTree">
  <header class="lq-et-top">
    <div>
      <h2>منصة العقارات</h2>
      <p>مركز قيادة · لوحة موظف · مسارات عمل مترابطة</p>
    </div>
    <div class="lq-et-top-actions">
      <button type="button" class="ghost lq-et-back-btn" id="etBackBtn" title="رجوع"><i data-lucide="arrow-right" class="lq-et-svg" aria-hidden="true"></i> رجوع</button>
      <button type="button" class="ghost lq-et-undo-btn" id="etUndoBtn" title="التراجع عن آخر أمر"><i data-lucide="undo-2" class="lq-et-svg" aria-hidden="true"></i> تراجع</button>
      <span id="etSaveBadge" class="lq-et-save-badge" hidden>تم الحفظ</span>
      <form class="lq-et-search" id="etSearchForm">
        <input id="etSearchInput" type="search" placeholder="بحث شامل: عميل · وحدة · مبنى · عقد · فاتورة · دفعة · حجز · صيانة" value="${esc(state.searchQ)}" autocomplete="off">
        <button type="submit">بحث</button>
      </form>
    </div>
  </header>
  <nav class="lq-et-nav" id="etNav" aria-label="أقسام منصة العقارات"></nav>
  <div class="lq-et-crumb" id="etCrumb"></div>
  <div class="lq-et-body" id="etBody"></div>
</div>`;
  }

  function mount() {
    const sec = document.getElementById("sec-estate-platform");
    if (!sec) return false;
    if (!state.mounted || !document.getElementById("lqEstateTree")) {
      sec.innerHTML = shellHtml();
      state.mounted = true;
      bindShell();
    }
    return true;
  }

  function bindShell() {
    document.getElementById("etNav")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-section]");
      if (!btn) return;
      go(btn.getAttribute("data-section"), { clearDetail: true, sub: "" });
    });
    document.getElementById("etBackBtn")?.addEventListener("click", () => goBack());
    document.getElementById("etUndoBtn")?.addEventListener("click", () => {
      if (window.LQ_ESTATE_OPS && typeof LQ_ESTATE_OPS.undoLast === "function") LQ_ESTATE_OPS.undoLast();
      else if (typeof toast === "function") toast("لا يوجد أمر للتراجع عنه");
    });
    document.getElementById("etSearchForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      state.searchQ = String(document.getElementById("etSearchInput")?.value || "").trim();
      go("search", { sub: "" });
    });
    document.getElementById("etBody")?.addEventListener("click", onBodyClick);
    document.getElementById("etCrumb")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-crumb]");
      if (!btn) return;
      const c = btn.getAttribute("data-crumb");
      if (c === "home") go("home", { clearDetail: true });
      else if (c === "properties") go("properties", { clearDetail: true, sub: state.sub || "buildings" });
      else if (c === "building") go("properties", { buildingId: state.buildingId, unitKey: "", tab: "overview" });
      else if (c === "clients") go("clients", { clientId: "", sub: state.sub || "all" });
      else if (c === "contracts") go("contracts", { contractId: "", sub: state.sub || "all" });
      else if (c === "approvals") go("approvals", { approvalId: "", sub: state.sub || "pending" });
    });
  }

  function onBodyClick(e) {
    const more = e.target.closest("[data-more]");
    if (more) {
      const id = more.getAttribute("data-more");
      state.moreOpen = state.moreOpen === id ? "" : id;
      render();
      return;
    }
    const docBtn = e.target.closest("[data-ops-doc]");
    if (docBtn) {
      const bar = docBtn.closest(".lq-ops-doc-bar");
      if (window.LQ_ESTATE_OPS && typeof LQ_ESTATE_OPS.handleDocAction === "function") {
        LQ_ESTATE_OPS.handleDocAction(docBtn.getAttribute("data-ops-doc"), {
          type: bar?.getAttribute("data-doc-type"),
          id: bar?.getAttribute("data-doc-id"),
        });
      }
      return;
    }
    const actEl = e.target.closest("[data-act]");
    if (actEl) {
      runAct(actEl.getAttribute("data-act"));
      return;
    }
    const open = e.target.closest("[data-open]");
    if (open) {
      const kind = open.getAttribute("data-open");
      const id = open.getAttribute("data-id");
      if (kind === "building") go("properties", { buildingId: id, unitKey: "", tab: "overview", sub: "buildings" });
      if (kind === "unit") go("properties", { unitKey: id, tab: "overview" });
      if (kind === "client") go("clients", { clientId: id });
      if (kind === "contract") go("contracts", { contractId: id });
      if (kind === "approval") go("approvals", { approvalId: id, sub: "pending" });
      if (kind === "reservation") go("reservations", { unitKey: id });
    }
    const sub = e.target.closest("[data-sub]");
    if (sub) {
      go(state.section, { sub: sub.getAttribute("data-sub"), buildingId: state.buildingId, unitKey: "", clientId: "", contractId: "", approvalId: "" });
    }
    const tab = e.target.closest("[data-tab]");
    if (tab) {
      state.tab = tab.getAttribute("data-tab");
      saveState();
      render();
    }
    const kpi = e.target.closest("[data-kpi]");
    if (kpi) {
      const k = kpi.getAttribute("data-kpi");
      if (k === "buildings") go("properties", { sub: "buildings", clearDetail: true });
      else go("properties", { sub: "units:" + k, clearDetail: true });
    }
  }

  function runAct(act) {
    const [name, arg] = String(act || "").split("|");
    if (name === "add_client") {
      if (!canAct("add_client")) return deny();
      if (typeof showSection === "function") showSection("clients");
      return;
    }
    if (name === "add_building") {
      if (!canAct("add_building")) return deny();
      if (typeof editRecord === "function") return editRecord("estate_buildings", "");
      if (typeof showSection === "function") showSection("estate-platform");
      return toastHint("استخدم إضافة مبنى من العقارات");
    }
    if (name === "add_unit") {
      if (!canAct("add_unit")) return deny();
      const et = arg === "room" ? "estate_rooms" : "estate_apartments";
      if (typeof editRecord === "function") return editRecord(et, "");
      return;
    }
    if (name === "create_reservation") {
      if (!canAct("create_reservation")) return deny();
      go("reservations", { sub: "create" });
      return;
    }
    if (name === "create_contract") {
      if (!canAct("create_contract")) return deny();
      if (arg && typeof openEstateContractFlow === "function") {
        const [et, eid] = arg.split(":");
        return openEstateContractFlow(et, eid);
      }
      go("contracts", { sub: "create" });
      return;
    }
    if (name === "pay") {
      if (!canAct("pay")) return deny();
      if (typeof showSection === "function") showSection("receivables");
      return;
    }
    if (name === "maint") {
      if (!canAct("maint")) return deny();
      if (typeof editRecord === "function") return editRecord("estate_maintenance", arg || "");
      go("maintenance", { sub: "create" });
      return;
    }
    if (name === "approvals") {
      go("approvals", { sub: "pending" });
      return;
    }
    if (name === "request_contract" && arg) {
      if (typeof requestEstateContractApproval === "function") return requestEstateContractApproval(arg);
      return;
    }
    if (name === "approve_contract" && arg) {
      if (!canAct("decide")) return deny();
      if (typeof approveEstateContract === "function") return approveEstateContract(arg);
      return;
    }
    if (name === "reject_contract" && arg) {
      if (!canAct("decide")) return deny();
      if (typeof rejectEstateContract === "function") return rejectEstateContract(arg);
      return;
    }
    if (name === "activate_contract" && arg) {
      if (!canAct("activate")) return deny();
      if (typeof activateEstateContract === "function") return activateEstateContract(arg);
      return;
    }
    if (name === "close_contract" && arg) {
      if (typeof closeEstateContractById === "function") return closeEstateContractById(arg);
      return;
    }
    if (name === "open_unit" && arg) {
      const [et, eid] = arg.split(":");
      if (typeof openEstateUnitDrawer === "function") openEstateUnitDrawer(et, eid);
      go("properties", { unitKey: arg });
      return;
    }
    if (name === "convert_res" && arg) {
      if (!canAct("create_contract")) return deny();
      const [et, eid] = arg.split(":");
      if (typeof openEstateContractFlow === "function") return openEstateContractFlow(et, eid);
      return;
    }
    if (name === "edit_building" && arg) {
      if (typeof editRecord === "function") return editRecord("estate_buildings", arg);
      return;
    }
    if (name === "edit_unit") {
      const [et, eid] = String(arg || state.unitKey).split(":");
      const table = et === "room" ? "estate_rooms" : "estate_apartments";
      if (typeof editRecord === "function") return editRecord(table, eid);
      return;
    }
    if (name === "edit_client" && arg) {
      if (typeof editRecord === "function") return editRecord("clients", arg);
      return;
    }
    if (name === "decide_approval" && arg) {
      if (!canAct("decide")) return deny();
      const [id, decision] = arg.split(":");
      if (window.LQ_APPROVALS && typeof LQ_APPROVALS.decide === "function") return LQ_APPROVALS.decide(id, decision === "1");
      return;
    }
    if (name === "goto_section" && arg) {
      if (typeof showSection === "function") showSection(arg);
      return;
    }
    if (name === "closed_edit") {
      if (!canAct("closed_edit")) return deny();
      if (typeof toast === "function") toast("طلب تعديل ملف مغلق — يُرسل لمركز الاعتمادات");
      go("approvals", { sub: "closed_edit" });
      return;
    }
  }
  function deny() {
    if (typeof toastErr === "function") toastErr("لا تملك صلاحية هذا الإجراء");
  }
  function toastHint(m) {
    if (typeof toast === "function") toast(m);
  }

  function lucideIco(name, cls) {
    return `<i data-lucide="${esc(name)}" class="${esc(cls || "")}" aria-hidden="true"></i>`;
  }
  function refreshIcons() {
    try {
      if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons({ attrs: { "stroke-width": 2 }, nameAttr: "data-lucide" });
      }
    } catch (_) {}
  }

  function renderNav() {
    const host = document.getElementById("etNav");
    if (!host) return;
    host.innerHTML = SECTIONS.filter((s) => canSection(s.id) && s.id !== "overdue")
      .map((s) => {
        const active = state.section === s.id ? "active" : "";
        return `<button type="button" data-section="${s.id}" class="${active}">${lucideIco(s.icon || "circle", "lq-et-nav-ico")}<span>${esc(s.label)}</span></button>`;
      })
      .join("");
  }

  function renderCrumb() {
    const host = document.getElementById("etCrumb");
    if (!host) return;
    if (state.section === "home") {
      host.innerHTML = "";
      host.hidden = true;
      return;
    }
    host.hidden = false;
    const parts = [`<button type="button" data-crumb="home">لوحة العقارات</button>`];
    if (state.section !== "home" && state.section !== "search") {
      const sec = SECTIONS.find((s) => s.id === state.section);
      parts.push(`<span>/</span><button type="button" data-crumb="${esc(state.section)}">${esc(sec?.label || state.section)}</button>`);
    }
    if (state.buildingId && !state.unitKey) {
      const b = byId("estate_buildings", state.buildingId);
      parts.push(`<span>/</span><span>${esc(b.name || state.buildingId)}</span>`);
    }
    if (state.unitKey) {
      const [et, eid] = state.unitKey.split(":");
      const u = byId(et === "room" ? "estate_rooms" : "estate_apartments", eid);
      parts.push(`<span>/</span><button type="button" data-crumb="building">المبنى</button>`);
      parts.push(`<span>/</span><span>${esc(u.name || eid)}</span>`);
    }
    if (state.clientId) {
      const c = byId("clients", state.clientId);
      parts.push(`<span>/</span><span>${esc(c.name || state.clientId)}</span>`);
    }
    if (state.contractId) {
      const c = byId("estate_contracts", state.contractId);
      parts.push(`<span>/</span><span>${esc(c.contract_no || state.contractId)}</span>`);
    }
    if (state.section === "search") parts.push(`<span>/</span><span>نتائج البحث</span>`);
    host.innerHTML = parts.join(" ");
  }

  function homeHubCounts() {
    const s = portfolioStats();
    const clients = rows("clients").length;
    const contracts = rows("estate_contracts").length;
    const invoices = rows("estate_contract_invoices").length;
    const t = todayStr();
    const paymentsToday = rows("estate_contract_invoices").filter((i) => {
      const day = String(i.issued_at || i.due_date || "").slice(0, 10);
      return day === t || Number(i.paid_amount || 0) > 0;
    }).length;
    const reserved = allUnits().filter((u) => unitStatus(u) === "reserved").length;
    const openMaint = rows("estate_maintenance").filter(
      (m) => !/closed|done|completed|ملغ/i.test(String(m.status || ""))
    ).length;
    const pendingMine = rows("approvals").filter((a) => String(a.status || "").toLowerCase() === "pending").length;
    const alerts = needsAttention().length;
    const buildings = rows("estate_buildings").length;
    const overdue = rows("estate_contract_invoices").filter(
      (i) => String(i.status || "").toLowerCase() !== "paid" && String(i.due_date || "") < t
    ).length;
    return {
      units: s.total,
      buildings,
      clients,
      contracts,
      invoices,
      payments: paymentsToday,
      reserved,
      maint: openMaint,
      approvals: pendingMine,
      alerts,
      occPct: s.occPct,
      overdue,
    };
  }

  function hubCard(h) {
    return `<button type="button" class="lq-et-hub-card ${h.span || ""} ${h.urgent ? "urgent" : ""}" data-hub="${esc(h.id)}">
      <div class="lq-et-hub-top">
        <span class="lq-et-hub-ico">${lucideIco(h.icon, "lq-et-svg")}</span>
        ${lucideIco("chevron-left", "lq-et-hub-arrow")}
      </div>
      <h4>${esc(h.label)}</h4>
      <p>${esc(h.desc)}</p>
      <strong>${esc(h.value)}</strong>
      <span class="lq-et-hub-enter">دخول ${lucideIco("arrow-left", "lq-et-enter-arrow")}</span>
    </button>`;
  }

  function buildingMapCoords(b, i) {
    const loc = String(b.location || b.notes || "");
    const m = loc.match(/(-?\d+\.?\d*)\s*[,،]\s*(-?\d+\.?\d*)/);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    // Stable scatter around حي التراث نزوى
    let hash = 0;
    const key = String(b.id || i);
    for (let n = 0; n < key.length; n++) hash = (hash * 31 + key.charCodeAt(n)) >>> 0;
    const ring = (hash % 8) + 1;
    const angle = ((hash % 360) * Math.PI) / 180;
    const dist = 0.0012 * ring;
    return {
      lat: HERITAGE_NIZWA.lat + Math.sin(angle) * dist,
      lng: HERITAGE_NIZWA.lng + Math.cos(angle) * dist,
    };
  }

  function destroyEstateTreeMap() {
    try {
      if (estateTreeMap) {
        estateTreeMap.remove();
      }
    } catch (_) {}
    estateTreeMap = null;
    estateTreeMarkers = null;
  }

  function mountHeritageMap() {
    const host = document.getElementById("etHeritageMap");
    if (!host || !window.L) return;
    destroyEstateTreeMap();
    estateTreeMap = window.L.map(host, { zoomControl: true, scrollWheelZoom: false }).setView(
      [HERITAGE_NIZWA.lat, HERITAGE_NIZWA.lng],
      HERITAGE_NIZWA.zoom
    );
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(estateTreeMap);
    estateTreeMarkers = window.L.layerGroup().addTo(estateTreeMap);
    const blds = rows("estate_buildings");
    const latLngs = [];
    blds.forEach((b, idx) => {
      const c = buildingMapCoords(b, idx);
      latLngs.push([c.lat, c.lng]);
      const st = buildingStats(b.id);
      const marker = window.L.circleMarker([c.lat, c.lng], {
        radius: 9,
        color: "#2563eb",
        weight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.9,
      }).addTo(estateTreeMarkers);
      marker.bindPopup(
        `<b>${esc(b.name || b.id)}</b><br>${esc(b.location || "حي التراث، نزوى")}<br>وحدات: ${fmtVal(st.total)} · إشغال ${fmtVal(st.occPct)}%`
      );
      marker.on("click", () => go("properties", { buildingId: b.id, unitKey: "", tab: "overview", sub: "buildings" }));
    });
    if (latLngs.length) {
      estateTreeMap.fitBounds(window.L.latLngBounds(latLngs).pad(0.35));
    }
    setTimeout(() => {
      try {
        estateTreeMap.invalidateSize();
      } catch (_) {}
    }, 80);
  }

  function renderHome() {
    const c = homeHubCounts();
    const need = needsAttention().slice(0, 5);
    const recent = recentOps().slice(0, 5);
    const hubs = [
      canSection("command") && {
        id: "command",
        icon: "gauge",
        label: "مركز القيادة",
        desc: "KPIs · إشغال · إيرادات · متأخرات",
        value: `إشغال ${fmtVal(c.occPct)}% · متأخرات ${fmtVal(c.overdue || 0)}`,
        span: "span-2",
      },
      canSection("employee") && {
        id: "employee",
        icon: "user-round",
        label: "لوحتي",
        desc: "مهامك واختصارات دورك",
        value: "شاشة الموظف",
      },
      canSection("properties") && {
        id: "properties",
        icon: "building-2",
        label: "العقارات",
        desc: "إدارة المباني والوحدات",
        value: `${fmtVal(c.units)} وحدة · ${fmtVal(c.buildings)} مبنى`,
      },
      canSection("clients") && {
        id: "clients",
        icon: "users",
        label: "العملاء",
        desc: "ملفات العملاء والمتابعات",
        value: `${fmtVal(c.clients)} عميل`,
      },
      canSection("contracts") && {
        id: "contracts",
        icon: "file-text",
        label: "العقود/فواتير",
        desc: "مسودة → اعتماد → تفعيل",
        value: `${fmtVal(c.contracts)} عقد · ${fmtVal(c.invoices)} فاتورة`,
      },
      canSection("collection") && {
        id: "collection",
        icon: "wallet",
        label: "التحصيل",
        desc: "الدفعات والسندات",
        value: `${fmtVal(c.payments)} دفعة`,
      },
      canSection("reservations") && {
        id: "reservations",
        icon: "calendar-check",
        label: "الحجوزات",
        desc: "الحجوزات الحالية والتحويل لعقود",
        value: `${fmtVal(c.reserved)} حجز`,
        span: "span-2",
        zone: "before-map",
      },
      canSection("maintenance") && {
        id: "maintenance",
        icon: "wrench",
        label: "الصيانة",
        desc: "طلبات الصيانة المفتوحة",
        value: `${fmtVal(c.maint)} طلبات`,
        span: "span-2",
        zone: "after-map",
      },
      canSection("approvals") && {
        id: "approvals",
        icon: "badge-check",
        label: "الاعتمادات",
        desc: "طلبات بانتظار قرارك",
        value: `${fmtVal(c.approvals)} بانتظارك`,
        urgent: c.approvals > 0,
        zone: "after-map",
      },
      canSection("reports") && {
        id: "reports",
        icon: "bar-chart-3",
        label: "التقارير",
        desc: "إشغال · تحصيل · عقود",
        value: `إشغال ${fmtVal(c.occPct)}%`,
        zone: "after-map",
      },
      canSection("files") && {
        id: "files",
        icon: "folder-open",
        label: "الملفات",
        desc: "مستندات العقارات والعملاء",
        value: "عرض الملفات",
        zone: "after-map",
      },
      {
        id: "alerts",
        icon: "bell",
        label: "التنبيهات",
        desc: "عقود · حجوزات · متأخرات",
        value: `${fmtVal(c.alerts)} تنبيه`,
        urgent: c.alerts > 0,
        zone: "after-map",
      },
    ].filter(Boolean);

    // Mark top cards before map by default
    hubs.forEach((h) => {
      if (!h.zone) h.zone = "before-map";
    });
    const before = hubs.filter((h) => h.zone === "before-map");
    const after = hubs.filter((h) => h.zone === "after-map");
    const mapCard = `<article class="lq-et-map-card span-2">
      <header class="lq-et-map-head">
        <div>
          <h4>${lucideIco("map-pinned", "lq-et-svg")} خارطة حي التراث — نزوى</h4>
          <p>دبابيس حية على أماكن البنايات داخل الخريطة</p>
        </div>
        <button type="button" class="ghost" data-hub="properties">${lucideIco("building", "lq-et-svg")} المباني</button>
      </header>
      <div id="etHeritageMap" class="lq-et-map" role="img" aria-label="خارطة حي التراث نزوى"></div>
    </article>`;

    return `
      <div class="lq-et-home">
        <div class="lq-et-home-board">
          <h3 class="lq-et-home-title">
            ${lucideIco("layout-dashboard", "lq-et-title-ico")}
            لوحة العقارات
          </h3>
          <div class="lq-et-hub">
            ${before.map(hubCard).join("")}
            ${mapCard}
            ${after.map(hubCard).join("")}
          </div>
        </div>
        <div class="lq-et-home-cols">
          <div class="lq-et-panel">
            <h3>${lucideIco("bell-ring", "lq-et-svg")} آخر التنبيهات</h3>
            <div class="lq-et-list">
              ${
                need.length
                  ? need
                      .map(
                        (n, i) =>
                          `<button type="button" class="lq-et-row" data-need="${i}" style="width:100%;cursor:pointer;font:inherit;text-align:start">
                            <div><b class="tone-${esc(n.tone)}">${esc(n.title)}</b><small>${esc(n.detail)}</small></div>
                            ${lucideIco("chevron-left", "lq-et-row-arrow")}
                          </button>`
                      )
                      .join("")
                  : `<div class="lq-et-empty">لا تنبيهات الآن</div>`
              }
            </div>
          </div>
          <div class="lq-et-panel">
            <h3>${lucideIco("history", "lq-et-svg")} آخر العمليات</h3>
            <div class="lq-et-list">
              ${
                recent.length
                  ? recent
                      .map(
                        (r, i) =>
                          `<button type="button" class="lq-et-row" data-recent="${i}" style="width:100%;cursor:pointer;font:inherit;text-align:start">
                            <div><b>${esc(r.title)}</b><small>${esc(r.detail)}</small></div>
                            ${lucideIco("chevron-left", "lq-et-row-arrow")}
                          </button>`
                      )
                      .join("")
                  : `<div class="lq-et-empty">لا عمليات حديثة</div>`
              }
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderAlerts() {
    const need = needsAttention();
    return `<div class="lq-et-panel">
      <h3>${lucideIco("bell", "lq-et-svg")} مركز التنبيهات</h3>
      <p class="mini">تنبيهات تشغيلية منفصلة عن الاعتمادات</p>
      <div class="lq-et-list" style="margin-top:12px">
        ${
          need.length
            ? need
                .map(
                  (n, i) =>
                    `<button type="button" class="lq-et-row" data-need="${i}" style="width:100%;cursor:pointer;font:inherit;text-align:start">
                      <div><b class="tone-${esc(n.tone)}">${esc(n.title)}</b><small>${esc(n.detail)}</small></div>
                      ${lucideIco("chevron-left", "lq-et-row-arrow")}
                    </button>`
                )
                .join("")
            : `<div class="lq-et-empty">لا تنبيهات</div>`
        }
      </div>
    </div>`;
  }

  function wireHomeLinks(root) {
    const need = needsAttention();
    const recent = recentOps().slice(0, 5);
    root.querySelectorAll("[data-hub]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.getAttribute("data-hub");
        if (id === "properties") go("properties", { clearDetail: true, sub: "buildings" });
        else if (id === "reservations") go("reservations", { clearDetail: true, sub: "current" });
        else if (id === "approvals") go("approvals", { clearDetail: true, sub: "pending" });
        else if (id === "alerts") go("alerts", { clearDetail: true });
        else go(id, { clearDetail: true });
      });
    });
    root.querySelectorAll("[data-need]").forEach((el) => {
      el.addEventListener("click", () => need[Number(el.getAttribute("data-need"))]?.go?.());
    });
    root.querySelectorAll("[data-recent]").forEach((el) => {
      el.addEventListener("click", () => recent[Number(el.getAttribute("data-recent"))]?.go?.());
    });
    if (state.section === "home") {
      requestAnimationFrame(() => mountHeritageMap());
    }
  }

  function subnav(items, current) {
    return `<div class="lq-et-subnav">${items
      .map((x) => `<button type="button" data-sub="${esc(x.id)}" class="${current === x.id ? "active" : ""}">${esc(x.label)}</button>`)
      .join("")}</div>`;
  }

  function renderProperties() {
    if (state.unitKey) return renderUnitTree();
    if (state.buildingId) return renderBuildingTree();

    const sub = state.sub || "buildings";
    const subs = [
      { id: "buildings", label: "جميع المباني" },
      { id: "buildings:active", label: "النشطة" },
      { id: "buildings:suspended", label: "الموقوفة" },
      { id: "buildings:follow", label: "تحتاج متابعة" },
      { id: "units", label: "جميع الوحدات" },
      { id: "units:vacant", label: "شاغرة" },
      { id: "units:occupied", label: "مؤجرة" },
      { id: "units:reserved", label: "محجوزة" },
      { id: "units:maintenance", label: "صيانة" },
      { id: "units:suspended", label: "موقوفة" },
      { id: "units:incomplete", label: "بيانات ناقصة" },
      { id: "status", label: "حالة العقارات" },
    ];

    if (String(sub).startsWith("buildings")) {
      let blds = rows("estate_buildings");
      if (sub === "buildings:active") blds = blds.filter((b) => !["suspended", "موقوفة"].includes(String(b.status || "").toLowerCase()));
      if (sub === "buildings:suspended") blds = blds.filter((b) => ["suspended", "موقوفة"].includes(String(b.status || "").toLowerCase()));
      if (sub === "buildings:follow") {
        blds = blds.filter((b) => {
          const st = buildingStats(b.id);
          return st.vacant > 0 || st.maint > 0 || st.occPct < 50;
        });
      }
      return (
        subnav(subs, sub) +
        `<div class="lq-et-panel"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <div><h3>المباني</h3><p class="mini">الخطوة الأولى: اختر مبنى</p></div>
          ${canAct("add_building") ? actionBtn("إضافة مبنى", "add_building", "gold-btn") : ""}
        </div>
        <div class="lq-et-cards" style="margin-top:12px">${
          blds.length
            ? blds
                .map((b) => {
                  const st = buildingStats(b.id);
                  return `<article class="lq-et-card" data-open="building" data-id="${esc(b.id)}">
                    <h4>${esc(b.name || b.id)}</h4>
                    <p class="mini">${esc(b.location || "—")}</p>
                    <div class="meta">
                      <span class="lq-et-chip">وحدات ${fmtVal(st.total)}</span>
                      <span class="lq-et-chip ok">${fmtVal(st.occupied)} مؤجرة</span>
                      <span class="lq-et-chip">${fmtVal(st.vacant)} شاغرة</span>
                      <span class="lq-et-chip warn">${fmtVal(st.occPct)}%</span>
                    </div>
                  </article>`;
                })
                .join("")
            : `<div class="lq-et-empty">لا نتائج</div>`
        }</div></div>`
      );
    }

    if (sub === "status") {
      const blds = rows("estate_buildings");
      return (
        subnav(subs, sub) +
        `<div class="lq-et-panel"><h3>حالة العقارات</h3><p class="mini">إشغال كل مبنى والوحدات المتاحة</p>
        <div class="lq-et-table-wrap" style="margin-top:10px"><table class="lq-et-table"><thead><tr>
          <th>المبنى</th><th>الإشغال</th><th>متاحة</th><th>غير متاحة</th><th>عقود تنتهي قريبًا</th>
        </tr></thead><tbody>${blds
          .map((b) => {
            const st = buildingStats(b.id);
            const soon = rows("estate_contracts").filter((c) => {
              if (String(c.building_id) !== String(b.id)) return false;
              if (String(c.status || "").toLowerCase() !== "active") return false;
              const left = daysUntil(c.end_date);
              return left != null && left >= 0 && left <= 30;
            }).length;
            const unavailable = st.occupied + st.maint + st.suspended;
            return `<tr data-open="building" data-id="${esc(b.id)}"><td><b>${esc(b.name || b.id)}</b></td><td>${fmtVal(st.occPct)}%</td><td>${fmtVal(st.vacant + st.reserved)}</td><td>${fmtVal(unavailable)}</td><td>${fmtVal(soon)}</td></tr>`;
          })
          .join("")}</tbody></table></div></div>`
      );
    }

    // units filters
    let units = allUnits();
    const filter = String(sub).startsWith("units:") ? sub.split(":")[1] : "";
    if (filter && filter !== "all") {
      if (filter === "occupied") units = units.filter((u) => ["occupied", "rented"].includes(unitStatus(u)));
      else if (filter === "vacant") units = units.filter((u) => ["vacant", "available", "draft", ""].includes(unitStatus(u)));
      else if (filter === "incomplete") units = units.filter((u) => !u.rent_price || !u.name);
      else units = units.filter((u) => unitStatus(u) === filter);
    }
    return (
      subnav(subs, sub) +
      `<div class="lq-et-panel"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div><h3>الوحدات</h3><p class="mini">${fmtVal(units.length)} وحدة</p></div>
        ${canAct("add_unit") ? actionBtn("إضافة وحدة", "add_unit|apartment", "gold-btn") : ""}
      </div>
      <div class="lq-et-cards" style="margin-top:12px">${
        units.length
          ? units
              .slice(0, 80)
              .map((u) => {
                const b = byId("estate_buildings", u.building_id);
                return `<article class="lq-et-card" data-open="unit" data-id="${esc(u.entityType + ":" + u.entityId)}">
                  <h4>${esc(u.name || u.id)} <span class="lq-et-chip">${esc(u.kindLabel)}</span></h4>
                  <p class="mini">${esc(b.name || "—")}</p>
                  <div class="meta">
                    <span class="lq-et-chip ${statusTone(unitStatus(u))}">${esc(statusAr(unitStatus(u)))}</span>
                    <span class="lq-et-chip">${moneyVal(u.rent_price)}</span>
                  </div>
                </article>`;
              })
              .join("")
          : `<div class="lq-et-empty">لا وحدات</div>`
      }</div></div>`
    );
  }

  function renderBuildingTree() {
    const b = byId("estate_buildings", state.buildingId);
    if (!b.id) {
      state.buildingId = "";
      return renderProperties();
    }
    const st = buildingStats(b.id);
    const byStatus = {
      occupied: st.units.filter((u) => ["occupied", "rented"].includes(unitStatus(u))),
      vacant: st.units.filter((u) => ["vacant", "available", "draft", ""].includes(unitStatus(u))),
      reserved: st.units.filter((u) => unitStatus(u) === "reserved"),
      maintenance: st.units.filter((u) => unitStatus(u) === "maintenance"),
      suspended: st.units.filter((u) => unitStatus(u) === "suspended"),
    };
    const tab = state.tab || "overview";
    const acts = [];
    if (canAct("add_unit")) acts.push({ label: "إضافة وحدة", act: "add_unit|apartment", cls: "gold-btn" });
    acts.push({ label: "تعديل المبنى", act: "edit_building|" + b.id });
    acts.push({ label: "عقود المبنى", act: "goto_section|contracts" });
    acts.push({ label: "التحصيل", act: "pay" });
    acts.push({ label: "الصيانة", act: "maint" });
    if (canAct("closed_edit")) acts.push({ label: "طلب تعديل ملف مغلق", act: "closed_edit" });

    const tabs = [
      { id: "overview", label: "ملخص المبنى" },
      { id: "units", label: "وحدات المبنى" },
      { id: "ops", label: "عمليات المبنى" },
    ];

    let content = "";
    if (tab === "overview") {
      content = `<div class="lq-et-kpis">
        <div class="lq-et-kpi"><span>رقم/اسم</span><strong>${esc(b.name || b.id)}</strong></div>
        <div class="lq-et-kpi"><span>الموقع</span><strong style="font-size:.95rem">${esc(b.location || "—")}</strong></div>
        <div class="lq-et-kpi"><span>الوحدات</span><strong>${fmtVal(st.total)}</strong></div>
        <div class="lq-et-kpi"><span>مؤجرة</span><strong>${fmtVal(st.occupied)}</strong></div>
        <div class="lq-et-kpi"><span>شاغرة</span><strong>${fmtVal(st.vacant)}</strong></div>
        <div class="lq-et-kpi"><span>محجوزة</span><strong>${fmtVal(st.reserved)}</strong></div>
        <div class="lq-et-kpi"><span>صيانة</span><strong>${fmtVal(st.maint)}</strong></div>
        <div class="lq-et-kpi"><span>الإشغال</span><strong>${fmtVal(st.occPct)}%</strong></div>
        <div class="lq-et-kpi"><span>إيجار متوقع</span><strong>${moneyVal(st.expected)}</strong></div>
        <div class="lq-et-kpi"><span>إيجار حالي</span><strong>${moneyVal(st.current)}</strong></div>
      </div>`;
    } else if (tab === "units") {
      content = Object.entries(byStatus)
        .map(([k, list]) => {
          if (!list.length) return "";
          return `<h4 style="margin:14px 0 8px">${esc(statusAr(k))} (${fmtVal(list.length)})</h4>
          <div class="lq-et-cards">${list
            .map(
              (u) => `<article class="lq-et-card" data-open="unit" data-id="${esc(u.entityType + ":" + u.entityId)}">
              <h4>${esc(u.name || u.id)}</h4>
              <div class="meta"><span class="lq-et-chip ${statusTone(unitStatus(u))}">${esc(statusAr(unitStatus(u)))}</span><span class="lq-et-chip">${moneyVal(u.rent_price)}</span></div>
            </article>`
            )
            .join("")}</div>`;
        })
        .join("") || `<div class="lq-et-empty">لا وحدات في هذا المبنى</div>`;
    } else {
      content = moreMenu("bld-ops", acts) + `<p class="mini" style="margin-top:12px">سجل التعديلات والمستندات من الملفات بعد الربط.</p>`;
    }

    return `<div class="lq-et-panel">
      <h3>شجرة المبنى · ${esc(b.name || b.id)}</h3>
      <p class="mini">${esc(b.location || "")} · ${esc(b.description || b.notes || "")}</p>
      <div class="lq-et-tabs">${tabs.map((t) => `<button type="button" data-tab="${t.id}" class="${tab === t.id ? "active" : ""}">${esc(t.label)}</button>`).join("")}</div>
      ${content}
      ${tab !== "ops" ? moreMenu("bld-quick", acts.slice(0, 4)) : ""}
    </div>`;
  }

  function parseUnitKey(key) {
    const [et, eid] = String(key || "").split(":");
    const table = et === "room" ? "estate_rooms" : "estate_apartments";
    return { et: et === "room" ? "room" : "apartment", eid, table, row: byId(table, eid) };
  }

  function renderUnitTree() {
    const { et, eid, row: u } = parseUnitKey(state.unitKey);
    if (!u.id) {
      state.unitKey = "";
      return renderBuildingTree();
    }
    if (u.building_id) state.buildingId = u.building_id;
    const st = unitStatus(u);
    const b = byId("estate_buildings", u.building_id);
    const contracts = rows("estate_contracts").filter((c) => String(c.entity_type || "").toLowerCase() === et && String(c.entity_id) === String(eid));
    const active = contracts.find((c) => String(c.status || "").toLowerCase() === "active");
    const tab = state.tab || "overview";
    const tabs = [
      { id: "overview", label: "بيانات الوحدة" },
      { id: "occupancy", label: "الإشغال الحالي" },
      { id: "ops", label: "عمليات الوحدة" },
      { id: "history", label: "سجل الوحدة" },
    ];

    const acts = [];
    if (st === "vacant" || st === "available" || st === "draft" || !st) {
      if (canAct("create_reservation")) acts.push({ label: "إنشاء حجز", act: "edit_unit|" + et + ":" + eid, cls: "gold-btn" });
      if (canAct("create_contract")) acts.push({ label: "إنشاء عقد", act: "create_contract|" + et + ":" + eid, cls: "gold-btn" });
      acts.push({ label: "تحويل لصيانة", act: "maint" });
      acts.push({ label: "تعديل البيانات", act: "edit_unit|" + et + ":" + eid });
    } else if (st === "reserved") {
      if (canAct("create_contract")) acts.push({ label: "تحويل الحجز إلى عقد", act: "convert_res|" + et + ":" + eid, cls: "gold-btn" });
      acts.push({ label: "تعديل الحجز", act: "edit_unit|" + et + ":" + eid });
    } else if (st === "occupied" || st === "rented") {
      if (active) acts.push({ label: "فتح العقد", act: "goto_section|contracts" });
      if (canAct("pay")) acts.push({ label: "تسجيل دفعة", act: "pay", cls: "gold-btn" });
      if (active && typeof canEstateCloseContract === "function" && canEstateCloseContract()) acts.push({ label: "إنهاء العقد", act: "close_contract|" + active.id });
      if (canAct("maint")) acts.push({ label: "طلب صيانة", act: "maint" });
    } else if (st === "maintenance") {
      if (canAct("maint")) acts.push({ label: "تحديث الصيانة", act: "maint", cls: "gold-btn" });
      acts.push({ label: "تعديل الوحدة", act: "edit_unit|" + et + ":" + eid });
    }

    let content = "";
    if (tab === "overview") {
      content = `<div class="lq-et-kpis">
        <div class="lq-et-kpi"><span>المبنى</span><strong style="font-size:.95rem">${esc(b.name || "—")}</strong></div>
        <div class="lq-et-kpi"><span>رقم الوحدة</span><strong>${esc(u.name || u.id)}</strong></div>
        <div class="lq-et-kpi"><span>النوع</span><strong>${esc(et === "room" ? "غرفة" : "شقة")}</strong></div>
        <div class="lq-et-kpi"><span>الغرف</span><strong>${esc(u.room_count ?? u.room_type ?? "—")}</strong></div>
        <div class="lq-et-kpi"><span>متوسط الإيجار</span><strong>${moneyVal(u.rent_price)}</strong></div>
        <div class="lq-et-kpi"><span>الحالة</span><strong>${esc(statusAr(st))}</strong></div>
      </div>
      <p class="mini" style="margin-top:10px">${esc(u.notes || "لا ملاحظات")}</p>`;
    } else if (tab === "occupancy") {
      if (st === "occupied" || st === "rented") {
        const client = byId("clients", active?.client_id || u.tenant_client_id);
        const invs = active
          ? rows("estate_contract_invoices").filter((i) => i.contract_id === active.id)
          : [];
        const due = invs.reduce((s, i) => s + Math.max(0, Number(i.amount || 0) - Number(i.paid_amount || 0)), 0);
        content = `<div class="lq-et-list">
          <div class="lq-et-row"><div><b>المستأجر</b><small>${esc(client.name || u.tenant_phone || "—")}</small></div></div>
          <div class="lq-et-row"><div><b>رقم العقد</b><small>${esc(active?.contract_no || "—")}</small></div></div>
          <div class="lq-et-row"><div><b>الفترة</b><small>${esc(active?.start_date || "—")} → ${esc(active?.end_date || "—")}</small></div></div>
          <div class="lq-et-row"><div><b>الإيجار</b><small>${moneyVal(active?.rent_amount || u.rent_price)}</small></div></div>
          <div class="lq-et-row"><div><b>المتأخرات</b><small class="${due > 0 ? "tone-bad" : "tone-ok"}">${moneyVal(due)}</small></div></div>
        </div>`;
      } else if (st === "reserved") {
        content = `<div class="lq-et-list">
          <div class="lq-et-row"><div><b>العميل</b><small>${esc(u.booked_client_name || byId("clients", u.booked_client_id).name || "—")}</small></div></div>
          <div class="lq-et-row"><div><b>فترة الحجز</b><small>${esc(u.reservation_start_date || "—")} → ${esc(u.reservation_end_date || "—")}</small></div></div>
          <div class="lq-et-row"><div><b>العربون</b><small>${moneyVal(u.booking_deposit)}</small></div></div>
          <div class="lq-et-row"><div><b>الموظف</b><small>${esc(u.booked_by_employee || "—")}</small></div></div>
        </div>`;
      } else if (st === "maintenance") {
        const m = rows("estate_maintenance").find((x) => (et === "room" ? x.room_id === eid : x.apartment_id === eid) && !String(x.status || "").toLowerCase().includes("closed"));
        content = `<div class="lq-et-list">
          <div class="lq-et-row"><div><b>نوع/عنوان</b><small>${esc(m?.title || u.maintenance_notes || "—")}</small></div></div>
          <div class="lq-et-row"><div><b>المسؤول</b><small>${esc(m?.responsible_name || "—")}</small></div></div>
          <div class="lq-et-row"><div><b>التكلفة</b><small>${moneyVal(m?.total_cost || u.maintenance_cost)}</small></div></div>
        </div>`;
      } else {
        const last = contracts.slice().sort((a, b) => String(b.end_date || "").localeCompare(String(a.end_date || "")))[0];
        content = `<div class="lq-et-list">
          <div class="lq-et-row"><div><b>الحالة</b><small>شاغرة</small></div></div>
          <div class="lq-et-row"><div><b>آخر عقد</b><small>${esc(last?.contract_no || "—")}</small></div></div>
          <div class="lq-et-row"><div><b>آخر إيجار</b><small>${moneyVal(last?.rent_amount || u.rent_price)}</small></div></div>
        </div>`;
      }
    } else if (tab === "ops") {
      content = moreMenu("unit-ops", acts);
    } else {
      content = `<div class="lq-et-table-wrap"><table class="lq-et-table"><thead><tr><th>عقد</th><th>حالة</th><th>فترة</th><th>إيجار</th></tr></thead><tbody>
        ${
          contracts.length
            ? contracts
                .map(
                  (c) =>
                    `<tr data-open="contract" data-id="${esc(c.id)}"><td>${esc(c.contract_no || c.id)}</td><td>${esc(contractStatusAr(c.status))}</td><td>${esc(c.start_date)} → ${esc(c.end_date)}</td><td>${moneyVal(c.rent_amount)}</td></tr>`
                )
                .join("")
            : `<tr><td colspan="4">لا سجل عقود</td></tr>`
        }
      </tbody></table></div>`;
    }

    return `<div class="lq-et-panel">
      <h3>شجرة الوحدة · ${esc(u.name || u.id)}</h3>
      <p class="mini">${esc(b.name || "")} · <span class="lq-et-chip ${statusTone(st)}">${esc(statusAr(st))}</span></p>
      <div class="lq-et-tabs">${tabs.map((t) => `<button type="button" data-tab="${t.id}" class="${tab === t.id ? "active" : ""}">${esc(t.label)}</button>`).join("")}</div>
      ${content}
      ${tab !== "ops" ? moreMenu("unit-quick", acts) : ""}
    </div>`;
  }

  function renderClients() {
    if (state.clientId) return renderClientFile();
    const sub = state.sub || "all";
    const subs = [
      { id: "all", label: "جميع العملاء" },
      { id: "tenants", label: "مستأجرون حاليون" },
      { id: "reserved", label: "لديهم حجز" },
      { id: "incomplete", label: "بيانات ناقصة" },
    ];
    let list = rows("clients");
    const activeClientIds = new Set(
      rows("estate_contracts")
        .filter((c) => String(c.status || "").toLowerCase() === "active")
        .map((c) => c.client_id)
    );
    const reservedIds = new Set(
      allUnits()
        .filter((u) => unitStatus(u) === "reserved")
        .map((u) => u.booked_client_id || u.tenant_client_id)
        .filter(Boolean)
    );
    if (sub === "tenants") list = list.filter((c) => activeClientIds.has(c.id));
    if (sub === "reserved") list = list.filter((c) => reservedIds.has(c.id));
    if (sub === "incomplete") list = list.filter((c) => !c.phone || !c.name);

    return (
      subnav(subs, sub) +
      `<div class="lq-et-panel"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div><h3>العملاء</h3><p class="mini">${fmtVal(list.length)} عميل</p></div>
        ${canAct("add_client") ? actionBtn("إضافة عميل", "add_client", "gold-btn") : ""}
      </div>
      <div class="lq-et-table-wrap" style="margin-top:10px"><table class="lq-et-table"><thead><tr><th>الاسم</th><th>الهاتف</th><th>الهوية</th><th>الحالة</th></tr></thead><tbody>
      ${
        list.length
          ? list
              .slice(0, 100)
              .map((c) => {
                let tag = "عميل";
                if (activeClientIds.has(c.id)) tag = "مستأجر حالي";
                else if (reservedIds.has(c.id)) tag = "حجز";
                return `<tr data-open="client" data-id="${esc(c.id)}"><td><b>${esc(c.name || c.id)}</b></td><td>${esc(c.phone || "—")}</td><td>${esc(c.national_id || "—")}</td><td>${esc(tag)}</td></tr>`;
              })
              .join("")
          : `<tr><td colspan="4">لا عملاء</td></tr>`
      }
      </tbody></table></div></div>`
    );
  }

  function renderClientFile() {
    const c = byId("clients", state.clientId);
    if (!c.id) {
      state.clientId = "";
      return renderClients();
    }
    const contracts = rows("estate_contracts").filter((x) => x.client_id === c.id);
    const tab = state.tab || "overview";
    const tabs = [
      { id: "overview", label: "البيانات الأساسية" },
      { id: "ops", label: "العمليات" },
      { id: "tx", label: "المعاملات" },
      { id: "files", label: "الملفات" },
    ];
    const acts = [];
    if (canAct("create_reservation")) acts.push({ label: "إنشاء حجز", act: "create_reservation" });
    if (canAct("create_contract")) acts.push({ label: "إنشاء عقد", act: "create_contract", cls: "gold-btn" });
    acts.push({ label: "تعديل البيانات", act: "edit_client|" + c.id });
    if (canAct("closed_edit")) acts.push({ label: "طلب اعتماد تعديل حساس", act: "closed_edit" });

    let content = "";
    if (tab === "overview") {
      content = `<div class="lq-et-kpis">
        <div class="lq-et-kpi"><span>رقم العميل</span><strong style="font-size:.9rem">${esc(c.id)}</strong></div>
        <div class="lq-et-kpi"><span>الاسم</span><strong style="font-size:.95rem">${esc(c.name || "—")}</strong></div>
        <div class="lq-et-kpi"><span>الهاتف</span><strong style="font-size:.95rem">${esc(c.phone || "—")}</strong></div>
        <div class="lq-et-kpi"><span>الهوية</span><strong style="font-size:.95rem">${esc(c.national_id || "—")}</strong></div>
        <div class="lq-et-kpi"><span>البريد</span><strong style="font-size:.9rem">${esc(c.email || "—")}</strong></div>
      </div><p class="mini" style="margin-top:10px">${esc(c.notes || "")}</p>`;
    } else if (tab === "ops") {
      content = moreMenu("client-ops", acts);
    } else if (tab === "tx") {
      content = `<div class="lq-et-table-wrap"><table class="lq-et-table"><thead><tr><th>عقد</th><th>حالة</th><th>وحدة</th></tr></thead><tbody>
        ${
          contracts.length
            ? contracts
                .map((x) => `<tr data-open="contract" data-id="${esc(x.id)}"><td>${esc(x.contract_no || x.id)}</td><td>${esc(contractStatusAr(x.status))}</td><td>${esc(x.entity_type)} ${esc(x.entity_id)}</td></tr>`)
                .join("")
            : `<tr><td colspan="3">لا معاملات</td></tr>`
        }
      </tbody></table></div>`;
    } else {
      content = `<p class="mini">الهوية / جواز / إثباتات — من مرفقات العميل والعقود المرتبطة.</p>
        ${c.id_card_image ? `<p class="mini">بطاقة: متوفرة</p>` : `<p class="mini">لا بطاقة مرفوعة</p>`}`;
    }
    return `<div class="lq-et-panel">
      <h3>ملف العميل · ${esc(c.name || c.id)}</h3>
      <div class="lq-et-tabs">${tabs.map((t) => `<button type="button" data-tab="${t.id}" class="${tab === t.id ? "active" : ""}">${esc(t.label)}</button>`).join("")}</div>
      ${content}
      ${tab !== "ops" ? moreMenu("client-quick", acts) : ""}
    </div>`;
  }

  function renderReservations() {
    const sub = state.sub || "current";
    const reserved = allUnits().filter((u) => unitStatus(u) === "reserved");
    const subs = [
      { id: "current", label: "الحجوزات الحالية" },
      { id: "expiring", label: "تنتهي قريبًا" },
      { id: "all", label: "الكل" },
    ];
    let list = reserved;
    if (sub === "expiring") list = reserved.filter((u) => {
      const left = daysUntil(u.reservation_end_date);
      return left != null && left >= 0 && left <= 7;
    });
    return (
      subnav(subs, sub) +
      `<div class="lq-et-panel"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div><h3>الحجوزات</h3><p class="mini">الحجز على الوحدة → اعتماد العقد عند التحويل</p></div>
        ${canAct("create_reservation") ? actionBtn("إنشاء حجز", "create_reservation", "gold-btn") : ""}
      </div>
      <div class="lq-et-cards" style="margin-top:12px">${
        list.length
          ? list
              .map((u) => {
                const acts = [];
                if (canAct("create_contract")) acts.push({ label: "تحويل إلى عقد", act: `convert_res|${u.entityType}:${u.entityId}`, cls: "gold-btn" });
                acts.push({ label: "فتح الوحدة", act: `open_unit|${u.entityType}:${u.entityId}` });
                return `<article class="lq-et-card">
                  <h4>${esc(u.name || u.id)}</h4>
                  <p class="mini">${esc(u.booked_client_name || "—")} · ${esc(u.reservation_start_date || "—")} → ${esc(u.reservation_end_date || "—")}</p>
                  <div class="meta"><span class="lq-et-chip warn">عربون ${moneyVal(u.booking_deposit)}</span></div>
                  ${moreMenu("res-" + u.id, acts)}
                </article>`;
              })
              .join("")
          : `<div class="lq-et-empty">لا حجوزات</div>`
      }</div></div>`
    );
  }

  function renderContracts() {
    if (state.contractId) return renderContractFile();
    const sub = state.sub || "all";
    const subs = [
      { id: "all", label: "الكل" },
      { id: "draft", label: "مسودات" },
      { id: "approvalrequested", label: "بانتظار الاعتماد" },
      { id: "active", label: "الحالية" },
      { id: "expiring", label: "قريبة الانتهاء" },
      { id: "ended", label: "منتهية" },
      { id: "rejected", label: "مرفوضة/معادة" },
    ];
    let list = rows("estate_contracts").slice();
    if (sub === "expiring") {
      list = list.filter((c) => {
        if (String(c.status || "").toLowerCase() !== "active") return false;
        const left = daysUntil(c.end_date);
        return left != null && left >= 0 && left <= 30;
      });
    } else if (sub !== "all") {
      list = list.filter((c) => String(c.status || "").toLowerCase() === sub);
    }
    return (
      subnav(subs, sub) +
      `<div class="lq-et-panel"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div><h3>العقود</h3><p class="mini">مسودة → اعتماد → تفعيل · لا تجاوز للمسار</p></div>
        ${canAct("create_contract") ? actionBtn("إنشاء عقد", "create_contract", "gold-btn") : ""}
      </div>
      <div class="lq-et-table-wrap" style="margin-top:10px"><table class="lq-et-table"><thead><tr>
        <th>رقم العقد</th><th>الحالة</th><th>العميل</th><th>الفترة</th><th>الإيجار</th>
      </tr></thead><tbody>${
        list.length
          ? list
              .map((c) => {
                const cl = byId("clients", c.client_id);
                return `<tr data-open="contract" data-id="${esc(c.id)}"><td><b>${esc(c.contract_no || c.id)}</b></td><td>${esc(contractStatusAr(c.status))}</td><td>${esc(cl.name || "—")}</td><td>${esc(c.start_date)} → ${esc(c.end_date)}</td><td>${moneyVal(c.rent_amount)}</td></tr>`;
              })
              .join("")
          : `<tr><td colspan="5">لا عقود</td></tr>`
      }</tbody></table></div></div>`
    );
  }

  function renderContractFile() {
    const c = byId("estate_contracts", state.contractId);
    if (!c.id) {
      state.contractId = "";
      return renderContracts();
    }
    const st = String(c.status || "").toLowerCase();
    const client = byId("clients", c.client_id);
    const closed = ["active", "approved", "ended", "cancelled"].includes(st);
    const acts = [];
    if (st === "draft" || st === "rejected") acts.push({ label: "إرسال للاعتماد", act: "request_contract|" + c.id, cls: "gold-btn" });
    if (st === "approvalrequested" && canAct("decide")) {
      acts.push({ label: "اعتماد", act: "approve_contract|" + c.id, cls: "gold-btn" });
      acts.push({ label: "رفض", act: "reject_contract|" + c.id });
    }
    if (st === "approved" && canAct("activate")) acts.push({ label: "تفعيل", act: "activate_contract|" + c.id, cls: "gold-btn" });
    if (st === "active" && canAct("pay")) acts.push({ label: "تسجيل دفعة", act: "pay" });
    if (st === "active") acts.push({ label: "إنهاء العقد", act: "close_contract|" + c.id });
    if (closed && canAct("closed_edit")) acts.push({ label: "طلب تعديل ملف مغلق", act: "closed_edit" });

    return `<div class="lq-et-panel">
      <h3>ملف العقد · ${esc(c.contract_no || c.id)}</h3>
      <p class="mini">الحالة: <b>${esc(contractStatusAr(c.status))}</b>${closed ? " · ملف يخضع لمسار الاعتماد عند التعديل" : ""}</p>
      <div class="lq-et-kpis" style="margin-top:10px">
        <div class="lq-et-kpi"><span>المستأجر</span><strong style="font-size:.95rem">${esc(client.name || "—")}</strong></div>
        <div class="lq-et-kpi"><span>الوحدة</span><strong style="font-size:.9rem">${esc(c.entity_type)} ${esc(c.entity_id)}</strong></div>
        <div class="lq-et-kpi"><span>الفترة</span><strong style="font-size:.85rem">${esc(c.start_date)} → ${esc(c.end_date)}</strong></div>
        <div class="lq-et-kpi"><span>الإيجار</span><strong>${moneyVal(c.rent_amount)}</strong></div>
      </div>
      ${c.rejection_reason ? `<p class="mini" style="color:var(--et-bad);margin-top:8px">سبب الرفض: ${esc(c.rejection_reason)}</p>` : ""}
      ${moreMenu("contract-ops", acts)}
      <div class="lq-ops-doc-bar" data-doc-type="estate_contract" data-doc-id="${esc(c.id)}">
        <button type="button" class="ghost" data-ops-doc="preview">معاينة</button>
        <button type="button" class="gold-btn" data-ops-doc="print">طباعة</button>
        ${canAct("edit_doc") ? `<button type="button" class="ghost" data-ops-doc="edit">تعديل</button>` : ""}
        ${canAct("delete_doc") ? `<button type="button" class="danger" data-ops-doc="delete">حذف</button>` : ""}
        <button type="button" class="ghost" data-ops-doc="toggle-pdf">${localStorage.getItem("lq_hide_pdf") === "1" ? "إظهار PDF" : "إخفاء PDF"}</button>
      </div>
      <div class="lq-ops-workflow-strip">
        <span class="${st === "draft" || st === "rejected" ? "on" : ""}">إنشاء</span>
        <span class="${st === "approvalrequested" ? "on" : ""}">مراجعة</span>
        <span class="${st === "approved" ? "on" : ""}">اعتماد</span>
        <span class="${st === "active" || st === "activated" ? "on" : ""}">تفعيل</span>
        <span class="${st === "ended" || st === "closed" ? "on" : ""}">إغلاق</span>
        <span class="${st === "archived" ? "on" : ""}">أرشفة</span>
      </div>
      <p class="mini" style="margin-top:12px">لا تعديل مباشر على الملفات المغلقة — استخدم طلب التعديل.</p>
    </div>`;
  }

  function renderCollection() {
    const sub = state.sub || "all";
    const inv = rows("estate_contract_invoices");
    const t = todayStr();
    const subs = [
      { id: "all", label: "جميع الدفعات" },
      { id: "today", label: "اليوم" },
      { id: "partial", label: "جزئية" },
      { id: "paid", label: "مكتملة" },
      { id: "late", label: "متأخرة" },
    ];
    let list = inv.slice();
    if (sub === "today") list = list.filter((i) => String(i.issued_at || i.due_date || "").slice(0, 10) === t);
    if (sub === "paid") list = list.filter((i) => String(i.status || "").toLowerCase() === "paid");
    if (sub === "partial") list = list.filter((i) => Number(i.paid_amount || 0) > 0 && Number(i.paid_amount || 0) < Number(i.amount || 0));
    if (sub === "late") list = list.filter((i) => String(i.status || "").toLowerCase() !== "paid" && String(i.due_date || "") < t);

    return (
      subnav(subs, sub) +
      `<div class="lq-et-panel"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div><h3>التحصيل</h3><p class="mini">تسجيل الدفعة مع إثبات — اعتماد عند الحاجة</p></div>
        ${canAct("pay") ? actionBtn("تسجيل دفعة", "pay", "gold-btn") : ""}
      </div>
      <div class="lq-et-table-wrap" style="margin-top:10px"><table class="lq-et-table"><thead><tr>
        <th>الفاتورة</th><th>الاستحقاق</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th>
      </tr></thead><tbody>${
        list.length
          ? list
              .slice(0, 80)
              .map((i) => {
                const rem = Math.max(0, Number(i.amount || 0) - Number(i.paid_amount || 0));
                return `<tr><td>${esc(i.invoice_no || i.id)}</td><td>${esc(i.due_date || "—")}</td><td>${moneyVal(i.amount)}</td><td>${moneyVal(i.paid_amount)}</td><td>${moneyVal(rem)}</td><td>${esc(i.status || "—")}</td></tr>`;
              })
              .join("")
          : `<tr><td colspan="6">لا دفعات</td></tr>`
      }</tbody></table></div></div>`
    );
  }

  function renderOverdue() {
    const t = todayStr();
    const list = rows("estate_contract_invoices").filter((i) => String(i.status || "").toLowerCase() !== "paid" && String(i.due_date || "") < t);
    return `<div class="lq-et-panel">
      <h3>المتأخرات</h3>
      <p class="mini">${fmtVal(list.length)} فاتورة متأخرة — للمتابعة والتحصيل</p>
      <div class="lq-et-table-wrap" style="margin-top:10px"><table class="lq-et-table"><thead><tr>
        <th>الفاتورة</th><th>العقد</th><th>الاستحقاق</th><th>المتبقي</th>
      </tr></thead><tbody>${
        list.length
          ? list
              .slice(0, 100)
              .map((i) => {
                const c = byId("estate_contracts", i.contract_id);
                const rem = Math.max(0, Number(i.amount || 0) - Number(i.paid_amount || 0));
                return `<tr><td>${esc(i.invoice_no || i.id)}</td><td>${esc(c.contract_no || i.contract_id || "—")}</td><td>${esc(i.due_date || "—")}</td><td class="tone-bad">${moneyVal(rem)}</td></tr>`;
              })
              .join("")
          : `<tr><td colspan="4">لا متأخرات</td></tr>`
      }</tbody></table></div>
      ${canAct("pay") ? moreMenu("overdue-ops", [{ label: "تسجيل دفعة", act: "pay", cls: "gold-btn" }]) : ""}
    </div>`;
  }

  function renderMaintenance() {
    const sub = state.sub || "open";
    const subs = [
      { id: "open", label: "مفتوحة" },
      { id: "all", label: "الكل" },
      { id: "closed", label: "مكتملة" },
    ];
    let list = rows("estate_maintenance").slice();
    if (sub === "open") list = list.filter((m) => !/closed|done|completed|ملغ/i.test(String(m.status || "")));
    if (sub === "closed") list = list.filter((m) => /closed|done|completed/i.test(String(m.status || "")));
    return (
      subnav(subs, sub) +
      `<div class="lq-et-panel"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div><h3>الصيانة</h3><p class="mini">طلب → اعتماد عند الحاجة → تنفيذ → إغلاق</p></div>
        ${canAct("maint") ? actionBtn("إنشاء طلب صيانة", "maint", "gold-btn") : ""}
      </div>
      <div class="lq-et-table-wrap" style="margin-top:10px"><table class="lq-et-table"><thead><tr>
        <th>التاريخ</th><th>العنوان</th><th>المسؤول</th><th>التكلفة</th><th>الحالة</th>
      </tr></thead><tbody>${
        list.length
          ? list
              .slice(0, 80)
              .map(
                (m) =>
                  `<tr><td>${esc(m.maintenance_date || "—")}</td><td><b>${esc(m.title || m.id)}</b></td><td>${esc(m.responsible_name || "—")}</td><td>${moneyVal(m.total_cost || Number(m.parts_cost || 0) + Number(m.labor_cost || 0))}</td><td>${esc(m.status || "—")}</td></tr>`
              )
              .join("")
          : `<tr><td colspan="5">لا طلبات</td></tr>`
      }</tbody></table></div></div>`
    );
  }

  function renderFiles() {
    const subs = [
      { id: "buildings", label: "ملفات المباني" },
      { id: "units", label: "ملفات الوحدات" },
      { id: "clients", label: "ملفات العملاء" },
      { id: "contracts", label: "العقود" },
      { id: "payments", label: "إثباتات الدفع" },
      { id: "maint", label: "الصيانة" },
    ];
    const sub = state.sub || "buildings";
    let rowsHtml = "";
    if (sub === "buildings") {
      rowsHtml = rows("estate_buildings")
        .map((b) => `<tr data-open="building" data-id="${esc(b.id)}"><td>${esc(b.name || b.id)}</td><td>${esc(b.location || "—")}</td><td>${b.image || b.attachments ? "مرفقات" : "—"}</td></tr>`)
        .join("");
    } else if (sub === "units") {
      rowsHtml = allUnits()
        .slice(0, 80)
        .map((u) => `<tr data-open="unit" data-id="${esc(u.entityType + ":" + u.entityId)}"><td>${esc(u.name || u.id)}</td><td>${esc(statusAr(unitStatus(u)))}</td><td>${u.image || u.attachments ? "مرفقات" : "—"}</td></tr>`)
        .join("");
    } else if (sub === "clients") {
      rowsHtml = rows("clients")
        .slice(0, 80)
        .map((c) => `<tr data-open="client" data-id="${esc(c.id)}"><td>${esc(c.name || c.id)}</td><td>${esc(c.phone || "—")}</td><td>${c.id_card_image ? "هوية" : "—"}</td></tr>`)
        .join("");
    } else if (sub === "contracts") {
      rowsHtml = rows("estate_contracts")
        .map((c) => `<tr data-open="contract" data-id="${esc(c.id)}"><td>${esc(c.contract_no || c.id)}</td><td>${esc(contractStatusAr(c.status))}</td><td>${c.attachments ? "مستندات" : "—"}</td></tr>`)
        .join("");
    } else if (sub === "payments") {
      rowsHtml = rows("estate_contract_invoices")
        .slice(0, 80)
        .map((i) => `<tr><td>${esc(i.invoice_no || i.id)}</td><td>${moneyVal(i.paid_amount)}</td><td>${esc(i.status || "—")}</td></tr>`)
        .join("");
    } else {
      rowsHtml = rows("estate_maintenance")
        .slice(0, 80)
        .map((m) => `<tr><td>${esc(m.title || m.id)}</td><td>${esc(m.status || "—")}</td><td>${m.invoice_no || "—"}</td></tr>`)
        .join("");
    }
    return (
      subnav(subs, sub) +
      `<div class="lq-et-panel"><h3>الملفات والمستندات</h3>
      <p class="mini">كل ملف مرتبط بعقار أو عميل أو عقد أو دفعة</p>
      <div class="lq-et-table-wrap" style="margin-top:10px"><table class="lq-et-table"><thead><tr><th>المرجع</th><th>التفاصيل</th><th>الملف</th></tr></thead>
      <tbody>${rowsHtml || `<tr><td colspan="3">لا ملفات</td></tr>`}</tbody></table></div></div>`
    );
  }

  function renderApprovals() {
    if (state.approvalId) return renderApprovalReview();
    const sub = state.sub || "pending";
    const subs = [
      { id: "pending", label: "بانتظار اعتمادي" },
      { id: "mine", label: "طلباتي المرسلة" },
      { id: "approved", label: "معتمدة" },
      { id: "rejected", label: "مرفوضة" },
      { id: "closed_edit", label: "تعديل ملفات مغلقة" },
    ];
    const me = String(Jawdah?.user?.name || Jawdah?.user?.username || "");
    let list = rows("approvals").slice();
    if (sub === "pending") list = list.filter((a) => String(a.status || "").toLowerCase() === "pending");
    if (sub === "mine") list = list.filter((a) => String(a.requested_by || "") === me);
    if (sub === "approved") list = list.filter((a) => String(a.status || "").toLowerCase() === "approved");
    if (sub === "rejected") list = list.filter((a) => String(a.status || "").toLowerCase() === "rejected");
    if (sub === "closed_edit") list = list.filter((a) => /closed|file|مغلق|تعديل/i.test(String(a.request_type || "") + String(a.notes || "")));

    const types = [
      "اعتماد عقد جديد",
      "اعتماد حجز",
      "اعتماد دفعة",
      "اعتماد صيانة",
      "اعتماد تعديل إيجار",
      "اعتماد فتح ملف مغلق",
      "اعتماد تعديل ملف مغلق",
    ];

    return (
      subnav(subs, sub) +
      `<div class="lq-et-panel"><h3>مركز الاعتمادات</h3>
      <p class="mini">قسم مستقل عن التنبيهات — سبب الرفض/الإعادة إلزامي</p>
      <div class="lq-et-list" style="margin:10px 0">${types.map((t) => `<div class="lq-et-row"><div><b>${esc(t)}</b><small>ضمن مسار الاعتماد حسب المستوى</small></div></div>`).join("")}</div>
      <div class="lq-et-table-wrap"><table class="lq-et-table"><thead><tr>
        <th>النوع</th><th>المرجع</th><th>مقدّم الطلب</th><th>التاريخ</th><th>الحالة</th>
      </tr></thead><tbody>${
        list.length
          ? list
              .slice(0, 60)
              .map(
                (a) =>
                  `<tr data-open="approval" data-id="${esc(a.id)}"><td>${esc(a.request_type || "—")}</td><td>${esc(a.entity || "")} ${esc(a.entity_id || "")}</td><td>${esc(a.requested_by || "—")}</td><td>${esc(a.requested_at || "—")}</td><td>${esc(a.status || "—")}</td></tr>`
              )
              .join("")
          : `<tr><td colspan="5">لا طلبات في هذا الفلتر</td></tr>`
      }</tbody></table></div>
      ${canSection("approvals") ? `<div style="margin-top:10px">${actionBtn("فتح مركز الاعتمادات الكامل", "goto_section|approvals", "ghost")}</div>` : ""}
      </div>`
    );
  }

  function renderApprovalReview() {
    const a = byId("approvals", state.approvalId);
    if (!a.id) {
      state.approvalId = "";
      return renderApprovals();
    }
    const acts = [];
    if (String(a.status || "").toLowerCase() === "pending" && canAct("decide")) {
      acts.push({ label: "اعتماد", act: "decide_approval|" + a.id + ":1", cls: "gold-btn" });
      acts.push({ label: "رفض", act: "decide_approval|" + a.id + ":0" });
    }
    return `<div class="lq-et-panel">
      <h3>مراجعة طلب الاعتماد</h3>
      <div class="lq-et-kpis" style="margin-top:10px">
        <div class="lq-et-kpi"><span>رقم الطلب</span><strong style="font-size:.9rem">${esc(a.id)}</strong></div>
        <div class="lq-et-kpi"><span>النوع</span><strong style="font-size:.9rem">${esc(a.request_type || "—")}</strong></div>
        <div class="lq-et-kpi"><span>مقدّم الطلب</span><strong style="font-size:.9rem">${esc(a.requested_by || "—")}</strong></div>
        <div class="lq-et-kpi"><span>التاريخ</span><strong style="font-size:.85rem">${esc(a.requested_at || "—")}</strong></div>
      </div>
      <div class="lq-et-list" style="margin-top:12px">
        <div class="lq-et-row"><div><b>المرجع</b><small>${esc(a.entity || "")} · ${esc(a.entity_id || "")}</small></div></div>
        <div class="lq-et-row"><div><b>الحالة</b><small>${esc(a.status || "—")}</small></div></div>
        <div class="lq-et-row"><div><b>ملاحظات / السبب</b><small>${esc(a.notes || "—")}</small></div></div>
        <div class="lq-et-row"><div><b>المعتمد</b><small>${esc(a.approved_by || "—")} · ${esc(a.approved_at || "")}</small></div></div>
      </div>
      <p class="mini" style="margin-top:10px">قرار المسؤول: اعتماد · رفض · إعادة للتعديل — سبب الرفض إلزامي.</p>
      ${moreMenu("appr-decide", acts)}
    </div>`;
  }

  function renderReports() {
    const s = portfolioStats();
    const activeContracts = rows("estate_contracts").filter((c) => String(c.status || "").toLowerCase() === "active").length;
    const pending = rows("approvals").filter((a) => String(a.status || "").toLowerCase() === "pending").length;
    const overdue = rows("estate_contract_invoices").filter((i) => String(i.status || "").toLowerCase() !== "paid" && String(i.due_date || "") < todayStr()).length;
    return `<div class="lq-et-panel">
      <h3>التقارير</h3>
      <p class="mini">ملخصات سريعة — التفاصيل من الأقسام أو مركز التقارير</p>
      <div class="lq-et-kpis" style="margin-top:12px">
        <div class="lq-et-kpi"><span>المباني</span><strong>${fmtVal(s.buildings)}</strong></div>
        <div class="lq-et-kpi"><span>الوحدات</span><strong>${fmtVal(s.total)}</strong></div>
        <div class="lq-et-kpi"><span>الإشغال</span><strong>${fmtVal(s.occPct)}%</strong></div>
        <div class="lq-et-kpi"><span>عقود نشطة</span><strong>${fmtVal(activeContracts)}</strong></div>
        <div class="lq-et-kpi"><span>متأخرات</span><strong>${fmtVal(overdue)}</strong></div>
        <div class="lq-et-kpi"><span>اعتمادات معلّقة</span><strong>${fmtVal(pending)}</strong></div>
        <div class="lq-et-kpi"><span>شاغرة</span><strong>${fmtVal(s.vacant)}</strong></div>
        <div class="lq-et-kpi"><span>صيانة</span><strong>${fmtVal(s.maint)}</strong></div>
      </div>
      ${moreMenu("reports-ops", [
        { label: "تقارير النظام", act: "goto_section|reports", cls: "gold-btn" },
        { label: "العقارات", act: "goto_section|estate-platform" },
      ])}
    </div>`;
  }

  function renderSearch() {
    if (window.LQ_ESTATE_OPS && typeof LQ_ESTATE_OPS.renderSearch === "function") {
      return LQ_ESTATE_OPS.renderSearch(state.searchQ, { rows, allUnits, byId, esc, fmtVal, moneyVal });
    }
    const q = String(state.searchQ || "").trim().toLowerCase();
    if (!q) {
      return `<div class="lq-et-panel"><h3>البحث العام</h3><p class="mini">اكتب في صندوق البحث أعلاه</p></div>`;
    }
    const match = (v) => String(v || "").toLowerCase().includes(q);
    const buildings = rows("estate_buildings").filter((b) => match(b.name) || match(b.id) || match(b.location));
    const units = allUnits().filter((u) => match(u.name) || match(u.id) || match(u.booked_client_name) || match(u.booked_client_phone));
    const clients = rows("clients").filter((c) => match(c.name) || match(c.phone) || match(c.national_id) || match(c.id));
    const contracts = rows("estate_contracts").filter((c) => match(c.contract_no) || match(c.id));
    const invoices = rows("estate_contract_invoices").filter((i) => match(i.invoice_no) || match(i.id));
    const maint = rows("estate_maintenance").filter((m) => match(m.title) || match(m.id) || match(m.invoice_no));

    function block(title, items, openKind) {
      if (!items.length) return "";
      return `<div class="lq-et-panel"><h3>${esc(title)} (${fmtVal(items.length)})</h3>
        <div class="lq-et-list">${items
          .slice(0, 15)
          .map((x) => {
            const id = openKind === "unit" ? `${x.entityType}:${x.entityId}` : x.id;
            const label = x.contract_no || x.invoice_no || x.name || x.title || x.id;
            return `<button type="button" class="lq-et-row" data-open="${esc(openKind)}" data-id="${esc(id)}" style="width:100%;font:inherit;cursor:pointer;text-align:start">
              <div><b>${esc(label)}</b><small>${esc(x.phone || x.location || x.status || x.due_date || "")}</small></div>
            </button>`;
          })
          .join("")}</div></div>`;
    }

    return (
      `<div class="lq-et-panel"><h3>نتائج البحث</h3><p class="mini">«${esc(state.searchQ)}» — مقسمة حسب النوع</p></div>` +
      block("عقارات / مباني", buildings, "building") +
      block("وحدات", units, "unit") +
      block("عملاء", clients, "client") +
      block("عقود", contracts, "contract") +
      block("دفعات", invoices, "contract") +
      block("صيانة", maint, "building") +
      (buildings.length + units.length + clients.length + contracts.length + invoices.length + maint.length
        ? ""
        : `<div class="lq-et-panel"><div class="lq-et-empty">لا نتائج</div></div>`)
    );
  }

  function renderBody() {
    const host = document.getElementById("etBody");
    if (!host) return;
    let html = "";
    switch (state.section) {
      case "home":
        html = renderHome();
        break;
      case "command":
      case "employee":
      case "workflows":
      case "archive":
      case "settings":
        html =
          window.LQ_ESTATE_OPS && typeof LQ_ESTATE_OPS.renderSection === "function"
            ? LQ_ESTATE_OPS.renderSection(state.section, state)
            : `<div class="lq-et-panel"><h3>جاري تحميل ${esc(state.section)}...</h3></div>`;
        break;
      case "properties":
        html = renderProperties();
        break;
      case "clients":
        html = renderClients();
        break;
      case "reservations":
        html = renderReservations();
        break;
      case "contracts":
        html = renderContracts();
        break;
      case "collection":
        html = renderCollection();
        break;
      case "overdue":
        html = renderOverdue();
        break;
      case "maintenance":
        html = renderMaintenance();
        break;
      case "files":
        html = renderFiles();
        break;
      case "approvals":
        html = renderApprovals();
        break;
      case "reports":
        html = renderReports();
        break;
      case "alerts":
        html = renderAlerts();
        break;
      case "search":
        html = renderSearch();
        break;
      default:
        html = renderHome();
    }
    host.innerHTML = html;
    if (state.section !== "home") destroyEstateTreeMap();
    if (state.section === "home" || state.section === "alerts") wireHomeLinks(host);
    if (typeof ensureEnglishDigits === "function") ensureEnglishDigits(host);
    refreshIcons();
  }

  function render() {
    loadState();
    if (!canSection(state.section) && state.section !== "search") {
      state.section = "home";
    }
    if (!mount()) return;
    renderNav();
    renderCrumb();
    renderBody();
    const input = document.getElementById("etSearchInput");
    if (input && document.activeElement !== input) input.value = state.searchQ || "";
    // Lucide may load after first paint
    setTimeout(refreshIcons, 40);
  }

  // Take over estate platform render after Nizwa shell
  window.renderEstatePlatform = render;
  window.showEstatePanel = function (panel) {
    const map = {
      overview: "home",
      media: "properties",
      ops: "home",
      add: "properties",
      maint: "maintenance",
      tables: "properties",
      booking: "contracts",
      finance: "collection",
    };
    go(map[panel] || "home", { clearDetail: true });
  };
  window.ensureForceEstateDock = function () {
    const host = document.getElementById("lqForceEstateDock");
    if (host) {
      host.style.display = "none";
      host.setAttribute("hidden", "true");
      host.innerHTML = "";
    }
  };
  window.LQ_ESTATE_TREE = { go, render, canSection, canAct, goBack, state, SECTIONS, navHistory };
  if (window.LQ_ESTATE_OPS && typeof LQ_ESTATE_OPS.attachTree === "function") {
    try {
      LQ_ESTATE_OPS.attachTree(window.LQ_ESTATE_TREE);
    } catch (_) {}
  }

  loadState();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (document.getElementById("sec-estate-platform")?.classList.contains("active")) render();
    });
  }
})();
