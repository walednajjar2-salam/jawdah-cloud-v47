(function () {
  "use strict";

  let modalEl = null;

  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement("div");
    modalEl.id = "lqSecurityModal";
    modalEl.className = "lq-security-modal";
    modalEl.innerHTML =
      '<div class="lq-security-card saas-glass">' +
      "<h3>🔐 المرحلة 1 — تغيير كلمة المرور</h3>" +
      "<p class=\"mini\">يجب تعيين كلمة مرور شخصية قبل استخدام النظام (10 أحرف أو أكثر).</p>" +
      '<label id="lqSecOldWrap">الحالية<input id="lqSecOld" type="password" autocomplete="current-password"></label>' +
      '<label>الجديدة<input id="lqSecNew" type="password" autocomplete="new-password"></label>' +
      '<label>تأكيد<input id="lqSecConfirm" type="password" autocomplete="new-password"></label>' +
      '<button type="button" class="gold-btn" id="lqSecSubmit">حفظ كلمة المرور</button>' +
      "</div>";
    document.body.appendChild(modalEl);
    modalEl.querySelector("#lqSecSubmit").addEventListener("click", submitChange);
    return modalEl;
  }

  function mustChange() {
    return !!(window.Jawdah && Jawdah.user && Jawdah.user.must_change_password);
  }

  function show(force) {
    const m = ensureModal();
    const oldWrap = m.querySelector("#lqSecOldWrap");
    if (oldWrap) oldWrap.style.display = force ? "none" : "grid";
    m.classList.add("open");
    document.body.classList.add("lq-security-lock");
  }

  function hide() {
    if (!modalEl) return;
    modalEl.classList.remove("open");
    document.body.classList.remove("lq-security-lock");
  }

  async function submitChange() {
    const newPwd = document.getElementById("lqSecNew").value;
    const confirm = document.getElementById("lqSecConfirm").value;
    if (newPwd !== confirm) {
      if (typeof toastNotice === "function") toastNotice("تأكيد كلمة المرور غير مطابق");
      return;
    }
    const body = { new_password: newPwd };
    const oldEl = document.getElementById("lqSecOld");
    if (oldEl && oldEl.parentElement.style.display !== "none") {
      body.old_password = oldEl.value;
    } else {
      body.force = true;
    }
    try {
      await api("change_password", { method: "POST", body: JSON.stringify(body) });
      if (Jawdah.user) Jawdah.user.must_change_password = false;
      hide();
      if (typeof toast === "function") toast("تم تحديث كلمة المرور");
    } catch (e) {
      if (typeof toastErr === "function") toastErr(e);
    }
  }

  function gateAfterAuth() {
    if (mustChange()) show(true);
  }

  window.LQ_SECURITY = {
    mustChange,
    show,
    hide,
    gateAfterAuth,
  };
})();
