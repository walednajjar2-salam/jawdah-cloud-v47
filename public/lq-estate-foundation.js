/* Estate platform foundation: autofill + durable save messaging.
 * Order: save → autofill → linking → approvals → permissions → tests → backup → staging → publish.
 * Publish remains blocked until integrity is clean.
 */
(function () {
  "use strict";

  const SAVED_OK = "تم الحفظ بنجاح";

  function toastSaved(msg) {
    const text = msg || SAVED_OK;
    if (typeof toastOk === "function") return toastOk(text);
    if (typeof toast === "function") return toast(text);
  }

  function toastFail(err, fallback) {
    if (typeof toastErr === "function") return toastErr(err, fallback || "فشل الحفظ");
    if (typeof toastBad === "function") return toastBad(err);
    if (typeof toast === "function") return toast(String(err?.message || err || fallback || "فشل الحفظ"), true);
  }

  async function fetchAutofill(kind, params) {
    const qs = new URLSearchParams({ kind, ...(params || {}) });
    const res = await api("estate_autofill?" + qs.toString());
    return res.autofill || {};
  }

  function applyFields(map) {
    Object.entries(map || {}).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (!el || value === undefined || value === null) return;
      if (el.tagName === "SELECT" || el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.value = value;
      }
    });
  }

  async function autofillClientInto(clientId, fieldMap) {
    if (!clientId) return null;
    try {
      const data = await fetchAutofill("client", { client_id: clientId });
      if (fieldMap) {
        const mapped = {};
        Object.entries(fieldMap).forEach(([key, elId]) => {
          if (data[key] !== undefined) mapped[elId] = data[key];
        });
        applyFields(mapped);
      }
      return data;
    } catch (e) {
      toastFail(e, "تعذر تعبئة بيانات العميل");
      return null;
    }
  }

  async function autofillUnitInto(entityType, entityId) {
    if (!entityType || !entityId) return null;
    try {
      return await fetchAutofill("unit", { entity_type: entityType, entity_id: entityId });
    } catch (e) {
      toastFail(e, "تعذر تعبئة بيانات الوحدة");
      return null;
    }
  }

  async function integrityCheck() {
    try {
      const res = await api("estate_integrity");
      return res.report || res;
    } catch (e) {
      toastFail(e, "تعذر فحص سلامة البيانات");
      return null;
    }
  }

  // Strengthen default save toast wording without breaking existing callers.
  const prevToastOk = typeof window.toastOk === "function" ? window.toastOk : null;
  if (prevToastOk) {
    window.toastOk = function (msg) {
      if (msg === "تم الحفظ" || msg === "تم حفظ التعديل" || msg === "تم حفظ الوحدة") {
        return prevToastOk(SAVED_OK);
      }
      return prevToastOk(msg);
    };
  }

  window.LQEstateFoundation = {
    SAVED_OK,
    toastSaved,
    toastFail,
    fetchAutofill,
    autofillClientInto,
    autofillUnitInto,
    integrityCheck,
    applyFields,
  };
})();
