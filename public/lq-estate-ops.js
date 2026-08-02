/* Launch Quality · Estate command center, employee board, workflows, UX ops */
(function () {
  "use strict";

  const undoStack = [];
  let settingsCache = null;
  let treeRef = null;

  const DEFAULT_SETTINGS = {
    unit_types: ["شقة", "غرفة", "محل", "مكتب"],
    unit_statuses: ["شاغرة", "محجوزة", "مستأجرة", "تحت الصيانة", "موقوفة", "مؤرشفة"],
    contract_types: ["سكني", "تجاري", "مختلط"],
    payment_methods: ["نقدي", "تحويل بنكي", "بطاقة", "شيك"],
    approval_threshold: 3000,
    contract_number_prefix: "EST-C",
    invoice_number_prefix: "EST-I",
    reservation_number_prefix: "EST-R",
  };

  const ROLE_BOARD = {
    owner: {
      title: "لوحة المالك",
      tasks: ["اعتماد العقود الكبيرة", "مراجعة المتأخرات", "إغلاق الشهر"],
      shortcuts: [
        { label: "مركز القيادة", section: "command" },
        { label: "الاعتمادات", section: "approvals" },
        { label: "التقارير", section: "reports" },
        { label: "إعدادات العقارات", section: "settings" },
      ],
    },
    admin: {
      title: "لوحة المدير",
      tasks: ["مراجعة الاعتمادات", "إدارة المستخدمين", "متابعة التنبيهات"],
      shortcuts: [
        { label: "مركز القيادة", section: "command" },
        { label: "الاعتمادات", section: "approvals" },
        { label: "العقود", section: "contracts" },
        { label: "الإعدادات", section: "settings" },
      ],
    },
    deputy: {
      title: "لوحة نائب المدير",
      tasks: ["اعتماد العمليات", "متابعة التحصيل", "الصيانة العاجلة"],
      shortcuts: [
        { label: "الاعتمادات", section: "approvals" },
        { label: "التحصيل", section: "collection" },
        { label: "الصيانة", section: "maintenance" },
      ],
    },
    manager: {
      title: "لوحة مدير العمليات",
      tasks: ["اعتماد الحجوزات/العقود", "متابعة الإشغال", "توزيع الصيانة"],
      shortcuts: [
        { label: "الحجوزات", section: "reservations" },
        { label: "العقود", section: "contracts" },
        { label: "الاعتمادات", section: "approvals" },
        { label: "الصيانة", section: "maintenance" },
      ],
    },
    accountant: {
      title: "لوحة المحاسب",
      tasks: ["تحصيل الفواتير", "مراجعة المتأخرات", "اعتماد الدفعات الكبيرة"],
      shortcuts: [
        { label: "التحصيل", section: "collection" },
        { label: "المتأخرات", section: "overdue" },
        { label: "الاعتمادات", section: "approvals" },
        { label: "التقارير", section: "reports" },
      ],
    },
    operations: {
      title: "لوحة مسؤول العقارات",
      tasks: ["إنشاء حجوزات وعقود", "تحديث حالات الوحدات", "رفع طلبات صيانة"],
      shortcuts: [
        { label: "العقارات", section: "properties" },
        { label: "الحجوزات", section: "reservations" },
        { label: "العقود", section: "contracts" },
        { label: "العملاء", section: "clients" },
      ],
    },
    reception: {
      title: "لوحة الاستقبال",
      tasks: ["استقبال العملاء", "فتح حجوزات", "متابعة الطلبات"],
      shortcuts: [
        { label: "العملاء", section: "clients" },
        { label: "الحجوزات", section: "reservations" },
        { label: "العقارات", section: "properties" },
      ],
    },
    maintenance: {
      title: "لوحة الصيانة",
      tasks: ["تنفيذ الطلبات المفتوحة", "تحديث حالة الصيانة", "إغلاق الطلبات"],
      shortcuts: [
        { label: "الصيانة", section: "maintenance" },
        { label: "العقارات", section: "properties" },
        { label: "التنبيهات", section: "alerts" },
      ],
    },
    viewer: {
      title: "لوحة المتابعة",
      tasks: ["عرض التقارير", "متابعة التنبيهات"],
      shortcuts: [
        { label: "التقارير", section: "reports" },
        { label: "التنبيهات", section: "alerts" },
        { label: "مركز القيادة", section: "command" },
      ],
    },
  };

  function esc(v) {
    if (typeof htmlEscape === "function") return htmlEscape(String(v ?? ""));
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }
  function moneyVal(n) {
    return typeof money === "function" ? money(n) : Number(n || 0).toFixed(3);
  }
  function fmtVal(n) {
    return typeof fmt === "function" ? fmt(n) : String(Number(n || 0));
  }
  function rows(k) {
    return Array.isArray(Jawdah?.data?.[k]) ? Jawdah.data[k] : [];
  }
  function role() {
    return String(Jawdah?.user?.role || "viewer").toLowerCase();
  }
  function todayStr() {
    return typeof today === "function" ? today() : new Date().toISOString().slice(0, 10);
  }
  function go(section, opts) {
    if (window.LQ_ESTATE_TREE && typeof LQ_ESTATE_TREE.go === "function") LQ_ESTATE_TREE.go(section, opts || {});
  }

  function markSaved(msg) {
    const badge = document.getElementById("etSaveBadge");
    if (!badge) {
      if (typeof toast === "function") toast(msg || "تم الحفظ");
      return;
    }
    badge.hidden = false;
    badge.classList.remove("is-saving");
    badge.textContent = msg || "تم الحفظ ✓";
    clearTimeout(markSaved._t);
    markSaved._t = setTimeout(() => {
      badge.hidden = true;
    }, 2200);
  }
  function markSaving() {
    const badge = document.getElementById("etSaveBadge");
    if (!badge) return;
    badge.hidden = false;
    badge.classList.add("is-saving");
    badge.textContent = "جاري الحفظ…";
  }

  function pushUndo(label, fn) {
    undoStack.push({ label, fn, at: Date.now() });
    if (undoStack.length > 25) undoStack.shift();
  }
  async function undoLast() {
    const item = undoStack.pop();
    if (!item) {
      if (typeof toast === "function") toast("لا يوجد أمر للتراجع عنه");
      return;
    }
    try {
      markSaving();
      await item.fn();
      markSaved("تم التراجع: " + item.label);
      if (typeof loadAll === "function") await loadAll();
      if (window.LQ_ESTATE_TREE) LQ_ESTATE_TREE.render();
    } catch (e) {
      if (typeof toastErr === "function") toastErr(e, "تعذر التراجع");
    }
  }

  function computeKpis() {
    const units = rows("estate_apartments").concat(rows("estate_rooms"));
    const buildings = rows("estate_buildings");
    const contracts = rows("estate_contracts");
    const invoices = rows("estate_contract_invoices");
    const t = todayStr();
    const occupied = units.filter((u) => /مستأجر|occupied|rented/i.test(String(u.status || ""))).length;
    const reserved = units.filter((u) => /محجوز|reserved/i.test(String(u.status || ""))).length;
    const vacant = units.filter((u) => /شاغر|vacant|available/i.test(String(u.status || "")) || !u.status).length;
    const activeContracts = contracts.filter((c) => /active|activated/i.test(String(c.status || ""))).length;
    const billed = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
    const paid = invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
    const overdue = invoices.filter((i) => String(i.status || "").toLowerCase() !== "paid" && String(i.due_date || "") < t);
    const overdueAmt = overdue.reduce((s, i) => s + Math.max(0, Number(i.amount || 0) - Number(i.paid_amount || 0)), 0);
    const occPct = units.length ? Math.round((occupied / units.length) * 100) : 0;

    // Best buildings by active rent
    const byBuilding = {};
    contracts
      .filter((c) => /active|activated/i.test(String(c.status || "")))
      .forEach((c) => {
        const bid = c.building_id || "—";
        byBuilding[bid] = (byBuilding[bid] || 0) + Number(c.rent_amount || 0);
      });
    const bestBuildings = Object.entries(byBuilding)
      .map(([id, rent]) => ({
        id,
        name: (buildings.find((b) => b.id === id) || {}).name || id,
        rent,
      }))
      .sort((a, b) => b.rent - a.rent)
      .slice(0, 5);

    // Most profitable units
    const byUnit = {};
    contracts
      .filter((c) => /active|activated/i.test(String(c.status || "")))
      .forEach((c) => {
        const key = (c.entity_type || "unit") + ":" + (c.entity_id || c.id);
        byUnit[key] = (byUnit[key] || 0) + Number(c.rent_amount || 0);
      });
    const bestUnits = Object.entries(byUnit)
      .map(([key, rent]) => {
        const [et, eid] = key.split(":");
        const table = et === "room" ? "estate_rooms" : "estate_apartments";
        const u = rows(table).find((x) => x.id === eid) || {};
        return { key, name: u.name || eid, rent, status: u.status || "" };
      })
      .sort((a, b) => b.rent - a.rent)
      .slice(0, 5);

    const alerts = buildRoleAlerts();
    return {
      units: units.length,
      buildings: buildings.length,
      occupied,
      reserved,
      vacant,
      occPct,
      activeContracts,
      billed,
      paid,
      overdueCount: overdue.length,
      overdueAmt,
      bestBuildings,
      bestUnits,
      alerts,
      pendingApprovals: rows("approvals").filter((a) => String(a.status || "").toLowerCase() === "pending").length,
      openMaint: rows("estate_maintenance").filter((m) => !/closed|done|completed/i.test(String(m.status || ""))).length,
    };
  }

  function buildRoleAlerts() {
    const r = role();
    const t = todayStr();
    const items = [];
    const overdue = rows("estate_contract_invoices").filter(
      (i) => String(i.status || "").toLowerCase() !== "paid" && String(i.due_date || "") < t
    );
    const pending = rows("approvals").filter((a) => String(a.status || "").toLowerCase() === "pending");
    const expiring = rows("estate_contracts").filter((c) => {
      if (!/active|activated/i.test(String(c.status || ""))) return false;
      const end = String(c.end_date || "");
      if (!end) return false;
      const d = (Date.parse(end) - Date.now()) / 86400000;
      return d >= 0 && d <= 30;
    });
    const openMaint = rows("estate_maintenance").filter((m) => !/closed|done|completed/i.test(String(m.status || "")));
    const reserved = rows("estate_apartments")
      .concat(rows("estate_rooms"))
      .filter((u) => /محجوز|reserved/i.test(String(u.status || "")));

    if (["owner", "admin", "deputy", "manager", "accountant"].includes(r) && overdue.length) {
      items.push({ level: "high", title: "متأخرات تحصيل", detail: overdue.length + " فاتورة متأخرة", go: "overdue" });
    }
    if (["owner", "admin", "deputy", "manager", "accountant", "operations"].includes(r) && pending.length) {
      items.push({ level: "high", title: "اعتمادات بانتظارك", detail: pending.length + " طلب", go: "approvals" });
    }
    if (["owner", "admin", "deputy", "manager", "operations"].includes(r) && expiring.length) {
      items.push({ level: "med", title: "عقود قاربت الانتهاء", detail: expiring.length + " عقد خلال 30 يوماً", go: "contracts" });
    }
    if (["owner", "admin", "deputy", "manager", "operations", "maintenance"].includes(r) && openMaint.length) {
      items.push({ level: "med", title: "صيانة مفتوحة", detail: openMaint.length + " طلب", go: "maintenance" });
    }
    if (["owner", "admin", "deputy", "manager", "operations", "reception"].includes(r) && reserved.length) {
      items.push({ level: "low", title: "حجوزات قائمة", detail: reserved.length + " وحدة محجوزة", go: "reservations" });
    }
    return items;
  }

  function renderCommand() {
    const k = computeKpis();
    return `<div class="lq-et-panel">
      <h3>مركز قيادة العقارات</h3>
      <p class="mini">مؤشرات لحظية · إشغال · إيرادات · متأخرات · أفضل أداء</p>
      <div class="lq-ops-kpi-grid" style="margin-top:12px">
        <div class="lq-ops-kpi"><span>الإشغال</span><strong class="ok">${fmtVal(k.occPct)}%</strong></div>
        <div class="lq-ops-kpi"><span>الإيرادات المحصّلة</span><strong>${moneyVal(k.paid)}</strong></div>
        <div class="lq-ops-kpi bad"><span>المتأخرات</span><strong>${moneyVal(k.overdueAmt)}</strong></div>
        <div class="lq-ops-kpi"><span>عقود نشطة</span><strong>${fmtVal(k.activeContracts)}</strong></div>
        <div class="lq-ops-kpi"><span>وحدات مستأجرة</span><strong>${fmtVal(k.occupied)}</strong></div>
        <div class="lq-ops-kpi"><span>محجوزة / شاغرة</span><strong>${fmtVal(k.reserved)} / ${fmtVal(k.vacant)}</strong></div>
        <div class="lq-ops-kpi"><span>اعتمادات معلّقة</span><strong>${fmtVal(k.pendingApprovals)}</strong></div>
        <div class="lq-ops-kpi"><span>صيانة مفتوحة</span><strong>${fmtVal(k.openMaint)}</strong></div>
      </div>
      <div class="lq-ops-split">
        <div class="lq-et-panel" style="margin:0">
          <h3>أفضل المباني أداءً</h3>
          ${
            k.bestBuildings.length
              ? k.bestBuildings
                  .map(
                    (b) =>
                      `<button type="button" class="lq-ops-rank-row" data-open="building" data-id="${esc(b.id)}"><span><b>${esc(b.name)}</b></span><strong>${moneyVal(b.rent)}</strong></button>`
                  )
                  .join("")
              : `<div class="lq-et-empty">لا بيانات بعد</div>`
          }
        </div>
        <div class="lq-et-panel" style="margin:0">
          <h3>أكثر الوحدات ربحية</h3>
          ${
            k.bestUnits.length
              ? k.bestUnits
                  .map(
                    (u) =>
                      `<button type="button" class="lq-ops-rank-row" data-open="unit" data-id="${esc(u.key)}"><span><b>${esc(u.name)}</b><small style="display:block;color:#64748b">${esc(u.status)}</small></span><strong>${moneyVal(u.rent)}</strong></button>`
                  )
                  .join("")
              : `<div class="lq-et-empty">لا بيانات بعد</div>`
          }
        </div>
      </div>
      <div class="lq-et-panel" style="margin-top:12px">
        <h3>تنبيهات الإدارة</h3>
        ${
          k.alerts.length
            ? k.alerts
                .map(
                  (a) =>
                    `<button type="button" class="lq-ops-alert-item" style="width:100%;border:0;background:transparent;cursor:pointer;font:inherit;text-align:start" data-act="goto_ops|${esc(a.go)}">
                      <span class="dot ${esc(a.level)}"></span>
                      <div><b>${esc(a.title)}</b><div class="mini">${esc(a.detail)}</div></div>
                    </button>`
                )
                .join("")
            : `<div class="lq-et-empty">لا تنبيهات إدارية الآن</div>`
        }
      </div>
    </div>`;
  }

  function renderEmployee() {
    const r = role();
    const board = ROLE_BOARD[r] || ROLE_BOARD.viewer;
    const alerts = buildRoleAlerts();
    const myApprovals = rows("approvals").filter((a) => String(a.status || "").toLowerCase() === "pending");
    const myMaint =
      r === "maintenance"
        ? rows("estate_maintenance").filter((m) => !/closed|done|completed/i.test(String(m.status || "")))
        : [];
    const myDrafts = rows("estate_contracts").filter((c) => /draft|approvalrequested/i.test(String(c.status || "")));

    return `<div class="lq-et-panel">
      <h3>${esc(board.title)}</h3>
      <p class="mini">مهامك · طلباتك · اختصارات عملك · تنبيهاتك فقط</p>
      <div class="lq-ops-employee-grid" style="margin-top:12px">
        <div class="lq-et-panel" style="margin:0">
          <h3>مهامي</h3>
          <ul class="check-list">${board.tasks.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
          ${
            myDrafts.length
              ? `<p class="mini" style="margin-top:8px">${fmtVal(myDrafts.length)} عقد في مسار الاعتماد</p>`
              : ""
          }
          ${
            myMaint.length
              ? `<p class="mini">${fmtVal(myMaint.length)} طلب صيانة مفتوح</p>`
              : ""
          }
        </div>
        <div class="lq-et-panel" style="margin:0">
          <h3>طلباتي / بانتظاري</h3>
          ${
            myApprovals.length
              ? myApprovals
                  .slice(0, 8)
                  .map(
                    (a) =>
                      `<div class="lq-ops-alert-item"><span class="dot high"></span><div><b>${esc(a.request_type || "طلب")}</b><div class="mini">${esc(a.requested_by || "")} · ${esc((a.requested_at || "").slice(0, 16))}</div></div></div>`
                  )
                  .join("")
              : `<div class="lq-et-empty">لا طلبات معلّقة لك الآن</div>`
          }
        </div>
      </div>
      <div class="lq-et-panel" style="margin-top:12px">
        <h3>اختصارات العمل</h3>
        <div class="lq-ops-employee-grid">
          ${board.shortcuts
            .map(
              (s) =>
                `<button type="button" class="lq-ops-shortcut" data-act="goto_ops|${esc(s.section)}"><span><b>${esc(s.label)}</b></span><span>←</span></button>`
            )
            .join("")}
        </div>
      </div>
      <div class="lq-et-panel" style="margin-top:12px">
        <h3>تنبيهاتي</h3>
        ${
          alerts.length
            ? alerts
                .map(
                  (a) =>
                    `<button type="button" class="lq-ops-alert-item" style="width:100%;border:0;background:transparent;cursor:pointer;font:inherit;text-align:start" data-act="goto_ops|${esc(a.go)}">
                      <span class="dot ${esc(a.level)}"></span>
                      <div><b>${esc(a.title)}</b><div class="mini">${esc(a.detail)}</div></div>
                    </button>`
                )
                .join("")
            : `<div class="lq-et-empty">لا تنبيهات خاصة بدورك</div>`
        }
      </div>
    </div>`;
  }

  function renderWorkflows() {
    const flows = [
      {
        title: "دورة حياة العقد",
        steps: ["إنشاء", "مراجعة", "اعتماد", "تفعيل", "إغلاق", "أرشفة"],
        note: "وفق مسار الاعتمادات — لا تفعيل دون اعتماد.",
      },
      {
        title: "دورة حياة الحجز",
        steps: ["إنشاء حجز", "اعتماد", "تحويل لعقد", "أو إلغاء"],
        note: "الحجز المحجوز لا يتحول لمستأجر إلا عبر عقد معتمد ومفعّل.",
      },
      {
        title: "دورة حياة الصيانة",
        steps: ["طلب", "اعتماد عند الحاجة", "تنفيذ", "إغلاق"],
        note: "التكاليف الكبيرة تمر على الاعتماد حسب الحد المحدد.",
      },
      {
        title: "دورة حياة الفاتورة / الدفعة",
        steps: ["إصدار", "استحقاق", "تحصيل", "إثبات دفع", "إغلاق"],
        note: "الدفعات فوق حد الاعتماد تتطلب موافقة المحاسب/المدير.",
      },
    ];
    return `<div class="lq-et-panel">
      <h3>مسارات العمل (Workflow)</h3>
      <p class="mini">تسلسل عملي واضح لكل عملية — مع تعبئة تلقائية عند الانتقال بين الخطوات</p>
      ${flows
        .map(
          (f) =>
            `<div class="lq-ops-flow-card"><h4>${esc(f.title)}</h4>
              <div class="lq-ops-flow-steps">${f.steps.map((s) => `<b>${esc(s)}</b>`).join("<span>→</span>")}</div>
              <p class="mini" style="margin-top:8px">${esc(f.note)}</p>
            </div>`
        )
        .join("")}
      <div class="lq-ops-oman-hint">
        <b>مرجع عقود الإيجار في سلطنة عُمان:</b>
        <p class="mini" style="margin:.4rem 0 0">يُفضّل توثيق بيانات المؤجر والمستأجر والوحدة والأجرة ومدة العقد وطريقة السداد بوضوح، مع حفظ الهوية/السجل والمرفقات في ملف العقد قبل الاعتماد والتفعيل.</p>
      </div>
    </div>`;
  }

  function renderArchive() {
    const archivedContracts = rows("estate_contracts").filter((c) => /ended|closed|cancelled|archived/i.test(String(c.status || "")));
    const archivedUnits = rows("estate_apartments")
      .concat(rows("estate_rooms"))
      .filter((u) => /موقوف|مؤرشف|archived|inactive/i.test(String(u.status || "")) || Number(u.archived) === 1);
    return `<div class="lq-et-panel">
      <h3>الأرشيف</h3>
      <p class="mini">الملفات القديمة محفوظة دون حذف — يمكن الرجوع إليها بسهولة</p>
      <div class="lq-ops-split" style="margin-top:12px">
        <div class="lq-et-panel" style="margin:0">
          <h3>عقود مؤرشفة / منتهية (${fmtVal(archivedContracts.length)})</h3>
          <div class="lq-et-list">${
            archivedContracts.length
              ? archivedContracts
                  .slice(0, 40)
                  .map(
                    (c) =>
                      `<button type="button" class="lq-et-row" data-open="contract" data-id="${esc(c.id)}" style="width:100%;font:inherit;cursor:pointer;text-align:start">
                        <div><b>${esc(c.contract_no || c.id)}</b><small>${esc(c.status)} · ${esc(c.end_date || "")}</small></div>
                      </button>`
                  )
                  .join("")
              : `<div class="lq-et-empty">لا عقود مؤرشفة</div>`
          }</div>
        </div>
        <div class="lq-et-panel" style="margin:0">
          <h3>وحدات مؤرشفة / موقوفة (${fmtVal(archivedUnits.length)})</h3>
          <div class="lq-et-list">${
            archivedUnits.length
              ? archivedUnits
                  .slice(0, 40)
                  .map((u) => {
                    const key = (u.entityType || (rows("estate_rooms").some((x) => x.id === u.id) ? "room" : "apartment")) + ":" + u.id;
                    return `<button type="button" class="lq-et-row" data-open="unit" data-id="${esc(u.entityType ? u.entityType + ":" + u.entityId : key)}" style="width:100%;font:inherit;cursor:pointer;text-align:start">
                      <div><b>${esc(u.name || u.id)}</b><small>${esc(u.status || "")}</small></div>
                    </button>`;
                  })
                  .join("")
              : `<div class="lq-et-empty">لا وحدات مؤرشفة</div>`
          }</div>
        </div>
      </div>
    </div>`;
  }

  async function loadSettings() {
    if (settingsCache) return settingsCache;
    try {
      const res = await api("estate_settings");
      settingsCache = Object.assign({}, DEFAULT_SETTINGS, res.settings || {});
    } catch (_e) {
      settingsCache = Object.assign({}, DEFAULT_SETTINGS);
    }
    return settingsCache;
  }

  function renderSettings() {
    const s = settingsCache || DEFAULT_SETTINGS;
    const list = (arr) => (Array.isArray(arr) ? arr.join("\n") : String(arr || ""));
    return `<div class="lq-et-panel">
      <h3>إعدادات العقارات</h3>
      <p class="mini">أنواع الوحدات · الحالات · العقود · طرق الدفع · حدود الاعتماد · الترقيم التلقائي</p>
      <form id="lqOpsSettingsForm" class="lq-ops-settings-grid" style="margin-top:12px">
        <label>أنواع الوحدات (سطر لكل نوع)<textarea name="unit_types" rows="4">${esc(list(s.unit_types))}</textarea></label>
        <label>حالات الوحدات<textarea name="unit_statuses" rows="4">${esc(list(s.unit_statuses))}</textarea></label>
        <label>أنواع العقود<textarea name="contract_types" rows="3">${esc(list(s.contract_types))}</textarea></label>
        <label>طرق الدفع<textarea name="payment_methods" rows="3">${esc(list(s.payment_methods))}</textarea></label>
        <label>حد الاعتماد (ر.ع)<input name="approval_threshold" type="number" step="0.001" value="${esc(s.approval_threshold)}"></label>
        <label>بادئة ترقيم العقود<input name="contract_number_prefix" value="${esc(s.contract_number_prefix)}"></label>
        <label>بادئة ترقيم الفواتير<input name="invoice_number_prefix" value="${esc(s.invoice_number_prefix)}"></label>
        <label>بادئة ترقيم الحجوزات<input name="reservation_number_prefix" value="${esc(s.reservation_number_prefix)}"></label>
        <div class="lq-et-actions">
          <button type="submit" class="gold-btn">حفظ الإعدادات</button>
        </div>
      </form>
    </div>`;
  }

  function wireSettingsForm() {
    const form = document.getElementById("lqOpsSettingsForm");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "1";
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const split = (k) =>
        String(fd.get(k) || "")
          .split(/\n|,/)
          .map((x) => x.trim())
          .filter(Boolean);
      const payload = {
        unit_types: split("unit_types"),
        unit_statuses: split("unit_statuses"),
        contract_types: split("contract_types"),
        payment_methods: split("payment_methods"),
        approval_threshold: Number(fd.get("approval_threshold") || 3000),
        contract_number_prefix: String(fd.get("contract_number_prefix") || "EST-C").trim(),
        invoice_number_prefix: String(fd.get("invoice_number_prefix") || "EST-I").trim(),
        reservation_number_prefix: String(fd.get("reservation_number_prefix") || "EST-R").trim(),
      };
      const prev = settingsCache ? Object.assign({}, settingsCache) : null;
      try {
        markSaving();
        const res = await api("estate_settings", { method: "POST", body: JSON.stringify(payload) });
        settingsCache = Object.assign({}, DEFAULT_SETTINGS, res.settings || payload);
        if (prev) {
          pushUndo("إعدادات العقارات", async () => {
            await api("estate_settings", { method: "POST", body: JSON.stringify(prev) });
            settingsCache = prev;
          });
        }
        markSaved("تم حفظ إعدادات العقارات");
      } catch (err) {
        if (typeof toastErr === "function") toastErr(err);
      }
    });
  }

  function renderSection(section) {
    if (section === "command") return renderCommand();
    if (section === "employee") return renderEmployee();
    if (section === "workflows") return renderWorkflows();
    if (section === "archive") return renderArchive();
    if (section === "settings") {
      loadSettings().then(() => {
        if (window.LQ_ESTATE_TREE && LQ_ESTATE_TREE.state?.section === "settings") {
          LQ_ESTATE_TREE.render();
          setTimeout(wireSettingsForm, 0);
        }
      });
      return renderSettings();
    }
    return `<div class="lq-et-panel"><h3>${esc(section)}</h3></div>`;
  }

  function renderSearch(qRaw, helpers) {
    const escFn = helpers.esc || esc;
    const fmtFn = helpers.fmtVal || fmtVal;
    const rowsFn = helpers.rows || rows;
    const allUnits = helpers.allUnits || (() => rowsFn("estate_apartments").concat(rowsFn("estate_rooms")));
    const q = String(qRaw || "").trim().toLowerCase();
    if (!q) {
      return `<div class="lq-et-panel"><h3>البحث الشامل</h3>
        <p class="mini">عميل · وحدة · مبنى · عقد · فاتورة · دفعة · حجز · صيانة</p>
        <div class="lq-ops-oman-hint"><b>عقود الإيجار (عُمان)</b><p class="mini">ابحث برقم العقد أو الهوية أو اسم المستأجر أو الوحدة.</p></div>
      </div>`;
    }
    const match = (v) => String(v || "").toLowerCase().includes(q);
    const omanTerms = ["إيجار", "مستأجر", "مؤجر", "أجرة", "تأمين", "فسخ", "تجديد", "عقد"];
    const termHit = omanTerms.filter((t) => q.includes(t.toLowerCase()) || t.includes(q));

    const buildings = rowsFn("estate_buildings").filter((b) => match(b.name) || match(b.id) || match(b.location));
    const units = allUnits().filter(
      (u) => match(u.name) || match(u.id) || match(u.booked_client_name) || match(u.booked_client_phone) || match(u.status)
    );
    const clients = rowsFn("clients").filter((c) => match(c.name) || match(c.phone) || match(c.national_id) || match(c.id) || match(c.email));
    const contracts = rowsFn("estate_contracts").filter(
      (c) => match(c.contract_no) || match(c.id) || match(c.notes) || match(c.status) || match(c.client_id)
    );
    const invoices = rowsFn("estate_contract_invoices").filter((i) => match(i.invoice_no) || match(i.id) || match(i.contract_id));
    const payments = rowsFn("payments").filter((p) => match(p.id) || match(p.method) || match(p.note) || match(p.invoice_id));
    const reservations = allUnits().filter((u) => /محجوز|reserved/i.test(String(u.status || "")) && (match(u.name) || match(u.booked_client_name) || match(u.booked_client_phone)));
    const maint = rowsFn("estate_maintenance").filter((m) => match(m.title) || match(m.id) || match(m.invoice_no) || match(m.responsible_name));

    function block(title, items, openKind) {
      if (!items.length) return "";
      return `<div class="lq-et-panel"><h3>${escFn(title)} (${fmtFn(items.length)})</h3>
        <div class="lq-et-list">${items
          .slice(0, 15)
          .map((x) => {
            const id = openKind === "unit" || openKind === "reservation" ? `${x.entityType || (x.room_type != null ? "room" : "apartment")}:${x.entityId || x.id}` : x.id;
            const label = x.contract_no || x.invoice_no || x.name || x.title || x.method || x.id;
            return `<button type="button" class="lq-et-row" data-open="${escFn(openKind === "reservation" ? "unit" : openKind)}" data-id="${escFn(id)}" style="width:100%;font:inherit;cursor:pointer;text-align:start">
              <div><b>${escFn(label)}</b><small>${escFn(x.phone || x.location || x.status || x.due_date || x.note || "")}</small></div>
            </button>`;
          })
          .join("")}</div></div>`;
    }

    const total =
      buildings.length + units.length + clients.length + contracts.length + invoices.length + payments.length + reservations.length + maint.length;

    return (
      `<div class="lq-et-panel"><h3>نتائج البحث الشامل</h3>
        <p class="mini">«${escFn(qRaw)}» — ${fmtFn(total)} نتيجة</p>
        ${
          termHit.length
            ? `<div class="lq-ops-oman-hint"><b>سياق إيجار عُماني:</b> <span class="mini">${escFn(termHit.join(" · "))} — راجع شروط العقد والهوية والأجرة قبل الاعتماد.</span></div>`
            : ""
        }
      </div>` +
      block("المباني", buildings, "building") +
      block("الوحدات", units, "unit") +
      block("العملاء", clients, "client") +
      block("العقود", contracts, "contract") +
      block("الفواتير", invoices, "contract") +
      block("الدفعات", payments, "contract") +
      block("الحجوزات", reservations, "reservation") +
      block("الصيانة", maint, "building") +
      (total ? "" : `<div class="lq-et-panel"><div class="lq-et-empty">لا نتائج</div></div>`)
    );
  }

  async function handleDocAction(action, meta) {
    const type = meta?.type;
    const id = meta?.id;
    if (action === "toggle-pdf") {
      const hide = localStorage.getItem("lq_hide_pdf") === "1" ? "0" : "1";
      localStorage.setItem("lq_hide_pdf", hide);
      document.body.classList.toggle("lq-hide-pdf", hide === "1");
      markSaved(hide === "1" ? "تم إخفاء أزرار PDF" : "تم إظهار أزرار PDF");
      if (window.LQ_ESTATE_TREE) LQ_ESTATE_TREE.render();
      return;
    }
    if (!id) return;
    if (type === "estate_contract") {
      if (action === "preview" || action === "print") {
        // Prefer classic contract document if linked; else show estate summary modal
        try {
          if (typeof openEstateContractFlow === "function" && action === "preview") {
            /* keep estate file open */
          }
          const c = rows("estate_contracts").find((x) => x.id === id);
          const body = document.getElementById("genericModalBody");
          if (body && typeof openModal === "function") {
            body.innerHTML = `<h2>معاينة العقد ${esc(c?.contract_no || id)}</h2>
              <p class="mini">الحالة: ${esc(c?.status || "")} · ${esc(c?.start_date || "")} → ${esc(c?.end_date || "")}</p>
              <p>الإيجار: <b>${moneyVal(c?.rent_amount)}</b></p>
              <div class="lq-ops-doc-bar">
                <button class="gold-btn" type="button" onclick="window.print()">طباعة</button>
                <button class="ghost" type="button" onclick="closeModal('genericModal')">إغلاق</button>
              </div>`;
            openModal("genericModal");
          }
          if (action === "print") setTimeout(() => window.print(), 200);
        } catch (e) {
          if (typeof toastErr === "function") toastErr(e);
        }
        return;
      }
      if (action === "edit" && typeof editRecord === "function") {
        return editRecord("estate_contracts", id);
      }
      if (action === "delete" && typeof delRecord === "function") {
        const prev = rows("estate_contracts").find((x) => x.id === id);
        pushUndo("حذف عقد", async () => {
          if (!prev) return;
          await api("estate_contracts", { method: "POST", body: JSON.stringify(prev) });
        });
        return delRecord("estate_contracts", id);
      }
    }
  }

  function patchRunActForGoto() {
    // Intercept body clicks for goto_ops via tree's data-act handler by extending run through mutation observer alternative:
    document.addEventListener(
      "click",
      (e) => {
        const el = e.target.closest('[data-act^="goto_ops|"]');
        if (!el) return;
        e.preventDefault();
        const sec = el.getAttribute("data-act").split("|")[1];
        if (sec) go(sec, { clearDetail: true });
      },
      true
    );
  }

  function enhanceSaveHooks() {
    const origSaveNew = window.saveNew;
    if (typeof origSaveNew === "function" && !origSaveNew._opsPatched) {
      window.saveNew = async function (...args) {
        markSaving();
        try {
          const res = await origSaveNew.apply(this, args);
          markSaved("تم حفظ البيانات");
          return res;
        } catch (e) {
          throw e;
        }
      };
      window.saveNew._opsPatched = true;
    }
    // Autofill helpers stay in app.js; surface indicator when contract property changes
    document.addEventListener("change", (e) => {
      const t = e.target;
      if (!t) return;
      if (t.id === "contractProperty" || t.id === "estateContractClient" || t.id === "invoiceContractSelect") {
        markSaved("تم التعبئة التلقائية للحقول المرتبطة");
      }
    });
  }

  function applyPdfPreference() {
    document.body.classList.toggle("lq-hide-pdf", localStorage.getItem("lq_hide_pdf") === "1");
  }

  function attachTree(tree) {
    treeRef = tree;
    applyPdfPreference();
    enhanceSaveHooks();
    setTimeout(wireSettingsForm, 0);
  }

  function onNav() {
    setTimeout(wireSettingsForm, 0);
  }

  // Patch invoice/contract modal toolbars once
  function enhanceDocModals() {
    ["invoiceModal", "contractModal"].forEach((id) => {
      const box = document.querySelector("#" + id + " .toolbar");
      if (!box || box.dataset.opsDoc === "1") return;
      box.dataset.opsDoc = "1";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ghost lq-pdf-toggle";
      btn.textContent = localStorage.getItem("lq_hide_pdf") === "1" ? "إظهار PDF" : "إخفاء PDF";
      btn.onclick = () => {
        const hide = localStorage.getItem("lq_hide_pdf") === "1" ? "0" : "1";
        localStorage.setItem("lq_hide_pdf", hide);
        document.body.classList.toggle("lq-hide-pdf", hide === "1");
        btn.textContent = hide === "1" ? "إظهار PDF" : "إخفاء PDF";
        markSaved(hide === "1" ? "تم إخفاء PDF" : "تم إظهار PDF");
      };
      box.appendChild(btn);
      // mark pdf download buttons
      box.querySelectorAll("button").forEach((b) => {
        if (/pdf|PDF/.test(b.textContent || "") || /Pdf/.test(b.getAttribute("onclick") || "")) {
          b.classList.add("lq-pdf-btn");
        }
      });
    });
  }

  window.LQ_ESTATE_OPS = {
    renderSection,
    renderSearch,
    handleDocAction,
    undoLast,
    pushUndo,
    markSaved,
    markSaving,
    attachTree,
    onNav,
    computeKpis,
    loadSettings,
  };

  patchRunActForGoto();
  applyPdfPreference();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      enhanceSaveHooks();
      enhanceDocModals();
      if (window.LQ_ESTATE_TREE) attachTree(window.LQ_ESTATE_TREE);
    });
  } else {
    enhanceSaveHooks();
    enhanceDocModals();
    if (window.LQ_ESTATE_TREE) attachTree(window.LQ_ESTATE_TREE);
  }
})();
