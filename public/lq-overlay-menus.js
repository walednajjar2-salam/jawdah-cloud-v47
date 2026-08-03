/* Independent quick-shortcut rail + full-navigation overlay. */
(function () {
  "use strict";

  const SHORTCUTS = [
    { label: "لوحة التحكم", section: "dashboard", icon: "home" },
    { label: "إضافة عقار", section: "properties", action: "focus", icon: "building" },
    { label: "إضافة عميل", section: "clients", action: "focus", icon: "users" },
    { label: "إنشاء عقد", section: "contracts", action: "focus", icon: "file" },
    { label: "الفواتير", section: "invoices", icon: "card" },
    { label: "التقارير", section: "reports", action: "reports", icon: "chart" },
    { label: "Backup", section: "backup", action: "backup", icon: "archive" },
    { label: "اختبار النظام", section: "qa", action: "qa", icon: "check" },
  ];

  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M6 10.5V20h12v-9.5"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
    users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3.5 19c1.2-3.2 3.3-4.8 5.5-4.8S13.3 15.8 14.5 19M14.2 14.4c1.3-.4 2.7-.2 4.3 1.1"/>',
    file: '<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>',
    chart: '<path d="M4 19V5M4 19h16"/><path d="M8 16v-5M12 16V8M16 16v-8"/>',
    archive: '<path d="M3 7h18v3H3zM5 10v9h14v-9M10 14h4"/>',
    check: '<circle cx="12" cy="12" r="8"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  };

  let root;
  let rail;
  let navGroups;
  let navObserver;
  let refreshFrame = 0;

  function svg(name, label) {
    const span = document.createElement("span");
    span.className = "lq-ov-icon";
    span.setAttribute("aria-hidden", "true");
    span.innerHTML =
      '<svg viewBox="0 0 24 24" role="img" focusable="false">' +
      (ICONS[name] || ICONS.grid) +
      "</svg>";
    if (label) span.title = label;
    return span;
  }

  function allowed(section) {
    try {
      return typeof canAccessSection === "function" && canAccessSection(section);
    } catch (_) {
      return false;
    }
  }

  function authenticated() {
    const app = document.getElementById("app");
    return (
      document.body.classList.contains("app-ready") &&
      app &&
      !app.classList.contains("hidden")
    );
  }

  function closeFullNav() {
    if (!root) return;
    root.classList.remove("lq-ov-nav-open");
    const fab = root.querySelector(".lq-ov-fab");
    if (fab) fab.setAttribute("aria-expanded", "false");
  }

  function openFullNav() {
    if (!root || !authenticated()) return;
    syncFullNav();
    root.classList.add("lq-ov-nav-open");
    const fab = root.querySelector(".lq-ov-fab");
    if (fab) fab.setAttribute("aria-expanded", "true");
  }

  function runShortcut(command) {
    if (!allowed(command.section)) return;
    closeFullNav();
    if (typeof window.dashCommandClick === "function") {
      window.dashCommandClick(command.section, command.action || "");
    }
  }

  function syncRail() {
    if (!rail) return;
    rail.innerHTML = "";
    if (!authenticated()) return;
    SHORTCUTS.filter((command) => allowed(command.section)).forEach((command) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lq-ov-shortcut";
      button.setAttribute("aria-label", command.label);
      button.title = command.label;

      const label = document.createElement("span");
      label.className = "lq-ov-shortcut-label";
      label.textContent = command.label;

      button.append(label, svg(command.icon, command.label));
      button.addEventListener("click", () => runShortcut(command));
      rail.appendChild(button);
    });
  }

  function goNizwa() {
    let token = "";
    try {
      token = String(localStorage.getItem("jawdah_cloud_token") || "");
    } catch (_) {}
    let url = "/quick-estate.html?portal=nizwaestate&t=" + Date.now();
    if (token) url += "&token=" + encodeURIComponent(token);
    location.href = url;
  }

  function executeNav(section, label) {
    closeFullNav();
    if (section && allowed(section) && typeof window.dashCommandClick === "function") {
      window.dashCommandClick(section, "");
      return;
    }
    if (!section && /عقارات نزوى/.test(label)) goNizwa();
  }

  function navButtonFrom(source) {
    const labelNode = source.querySelector(".nav-ar,.nav-label,.nav-text");
    const label = String(labelNode ? labelNode.textContent : source.textContent || "").trim();
    const section = String(source.dataset.section || "").trim();
    if (!label || (section && !allowed(section))) return null;
    if (!section && !/عقارات نزوى/.test(label)) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "lq-ov-nav-item";
    button.dataset.section = section;

    const text = document.createElement("span");
    text.textContent = label;

    const sourceIcon = source.querySelector(".nav-icon");
    if (sourceIcon) {
      const icon = sourceIcon.cloneNode(true);
      icon.removeAttribute("style");
      button.append(text, icon);
    } else {
      button.append(text, svg("grid", label));
    }
    button.addEventListener("click", () => executeNav(section, label));
    return button;
  }

  function appendGroup(title, sources, used) {
    const items = [];
    sources.forEach((source) => {
      const key = source.dataset.section || String(source.textContent || "").trim();
      if (used.has(key)) return;
      const item = navButtonFrom(source);
      if (!item) return;
      used.add(key);
      items.push(item);
    });
    if (!items.length) return;

    const group = document.createElement("section");
    group.className = "lq-ov-nav-group";
    const heading = document.createElement("strong");
    heading.className = "lq-ov-nav-group-title";
    heading.textContent = title || "التشغيل";
    const list = document.createElement("div");
    list.className = "lq-ov-nav-items";
    items.forEach((item) => list.appendChild(item));
    group.append(heading, list);
    navGroups.appendChild(group);
  }

  function syncFullNav() {
    const sourceNav = document.getElementById("nav");
    if (!sourceNav || !navGroups || !authenticated()) return;
    navGroups.innerHTML = "";
    const used = new Set();
    const groups = Array.from(sourceNav.querySelectorAll(":scope > .lq-nav-dd"));

    groups.forEach((group) => {
      const titleNode = group.querySelector(":scope > .lq-dd-toggle .lq-dd-title");
      const title = String(titleNode ? titleNode.textContent : "").trim();
      const buttons = Array.from(
        group.querySelectorAll(":scope > .lq-dd-panel > button")
      );
      appendGroup(title, buttons, used);
    });

    const ungrouped = Array.from(sourceNav.querySelectorAll(":scope > button"));
    appendGroup("التشغيل", ungrouped, used);

    if (!navGroups.children.length) {
      appendGroup(
        "التشغيل",
        Array.from(sourceNav.querySelectorAll("button[data-section]")),
        used
      );
    }
  }

  function scheduleRefresh() {
    cancelAnimationFrame(refreshFrame);
    refreshFrame = requestAnimationFrame(() => {
      if (!root) return;
      root.hidden = !authenticated();
      syncRail();
      syncFullNav();
      if (!authenticated()) closeFullNav();
    });
  }

  function attachNavObserver() {
    const nav = document.getElementById("nav");
    if (!nav || nav.dataset.lqOverlayObserved === "1") return;
    nav.dataset.lqOverlayObserved = "1";
    navObserver = new MutationObserver(scheduleRefresh);
    navObserver.observe(nav, { childList: true, subtree: true });
  }

  function init() {
    if (document.getElementById("lqOverlayMenus")) return;
    root = document.createElement("div");
    root.id = "lqOverlayMenus";
    root.className = "lq-ov-root";
    root.hidden = true;
    root.innerHTML =
      '<aside class="lq-ov-rail" aria-label="اختصارات سريعة"></aside>' +
      '<button class="lq-ov-fab" type="button" aria-label="فتح قائمة التنقل الكاملة" aria-expanded="false">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS.grid + "</svg></button>" +
      '<div class="lq-ov-backdrop" aria-hidden="true"></div>' +
      '<section class="lq-ov-nav-card" role="dialog" aria-modal="true" aria-label="قائمة التنقل الكاملة">' +
      '<header class="lq-ov-nav-head"><strong>قائمة التنقل الكاملة</strong>' +
      '<button class="lq-ov-close" type="button" aria-label="إغلاق">×</button></header>' +
      '<div class="lq-ov-nav-scroll"><div class="lq-ov-nav-groups"></div></div></section>';
    document.body.appendChild(root);

    rail = root.querySelector(".lq-ov-rail");
    navGroups = root.querySelector(".lq-ov-nav-groups");
    root.querySelector(".lq-ov-fab").addEventListener("click", () => {
      if (root.classList.contains("lq-ov-nav-open")) closeFullNav();
      else openFullNav();
    });
    root.querySelector(".lq-ov-close").addEventListener("click", closeFullNav);
    root.querySelector(".lq-ov-backdrop").addEventListener("click", closeFullNav);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeFullNav();
    });

    new MutationObserver(() => {
      attachNavObserver();
      scheduleRefresh();
    }).observe(document.body, { attributes: true, attributeFilter: ["class"] });

    attachNavObserver();
    scheduleRefresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.LQOverlayMenus = {
    refresh: scheduleRefresh,
    open: openFullNav,
    close: closeFullNav,
    shortcutLabels: () => SHORTCUTS.filter((item) => allowed(item.section)).map((item) => item.label),
  };
})();
