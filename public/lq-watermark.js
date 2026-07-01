(function () {
  "use strict";

  function ensureWatermark() {
    let el = document.getElementById("lqBrandWatermark");
    if (!el) {
      el = document.createElement("div");
      el.id = "lqBrandWatermark";
      el.setAttribute("aria-hidden", "true");
      el.innerHTML =
        '<img src="assets/brand-logo-gold.png?v=17" alt="" decoding="async" draggable="false">';
      document.body.appendChild(el);
      return;
    }
    const img = el.querySelector("img");
    if (img && /brand-logo-gold-source/i.test(img.getAttribute("src") || "")) {
      img.src = "assets/brand-logo-gold.png?v=17";
    }
  }

  function sync() {
    const app = document.getElementById("app");
    if (app && !app.classList.contains("hidden")) ensureWatermark();
  }

  document.addEventListener("DOMContentLoaded", sync);
  window.addEventListener("load", sync);

  const obs = new MutationObserver(sync);
  window.addEventListener("load", function () {
    const app = document.getElementById("app");
    if (app) obs.observe(app, { attributes: true, attributeFilter: ["class"] });
  });
})();
