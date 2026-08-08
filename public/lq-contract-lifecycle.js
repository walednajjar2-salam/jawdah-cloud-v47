/* دورة عقد الإيجار الكاملة — مشاريع جودة الانطلاقة */
(function () {
  "use strict";

  const STEPS = [
    { id: "parties", label: "1) العميل والوحدة" },
    { id: "finance", label: "2) المالية والمدة" },
    { id: "dossier", label: "3) الشروط والمرفقات" },
    { id: "review", label: "4) المراجعة والاعتماد" },
    { id: "sign", label: "5) التوقيع" },
    { id: "activate", label: "6) التفعيل" },
    { id: "close", label: "7) الإنهاء/الإخلاء" },
  ];

  const state = {
    step: "parties",
    contractId: null,
    contract: null,
    readiness: null,
    actions: [],
  };

  function esc(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function toast(msg, err) {
    if (typeof window.toast === "function") return window.toast(msg, !!err);
    if (err && typeof window.toastErr === "function") return window.toastErr({ message: msg });
    if (!err && typeof window.toastNotice === "function") return window.toastNotice(msg);
  }

  async function api(path, opts) {
    if (typeof window.api === "function") return window.api(path, opts);
    throw new Error("API غير جاهز");
  }

  function data(table) {
    return Array.isArray(window.Jawdah?.data?.[table]) ? window.Jawdah.data[table] : [];
  }

  function today() {
    return typeof window.today === "function" ? window.today() : new Date().toISOString().slice(0, 10);
  }

  function money(n) {
    return typeof window.money === "function" ? window.money(n) : `OMR ${Number(n || 0).toFixed(3)}`;
  }

  function optionList(rows, valueKey, labelFn, selected) {
    return ['<option value="">اختر</option>']
      .concat(
        rows.map((r) => {
          const v = r[valueKey];
          const label = typeof labelFn === "function" ? labelFn(r) : r.name || v;
          return `<option value="${esc(v)}" ${String(selected) === String(v) ? "selected" : ""}>${esc(label)}</option>`;
        })
      )
      .join("");
  }

  function propertyLabel(p) {
    if (typeof window.propertyLabel === "function") return window.propertyLabel(p);
    return p?.name || p?.id || "—";
  }

  function host() {
    return $("#lqContractLifecycle");
  }

  function parseJson(v, fb) {
    if (v == null || v === "") return fb;
    if (typeof v === "object") return v;
    try {
      return JSON.parse(v);
    } catch (_e) {
      return fb;
    }
  }

  function renderShell() {
    const el = host();
    if (!el) return;
    el.innerHTML = `
      <div class="lq-lc-wrap">
        <div class="card">
          <h3>دورة عقد الإيجار الكاملة</h3>
          <p class="mini">من اختيار العميل والوحدة → المالية → ملف الاستلام والمرفقات → الاعتماد → التوقيع → التفعيل → الإنهاء/الإخلاء، مع سجل إصدارات كامل.</p>
          <div class="lq-lc-steps" id="lqLcSteps"></div>
          <div id="lqLcBody"></div>
        </div>
      </div>`;
    paintSteps();
    paintBody();
  }

  function paintSteps() {
    const box = $("#lqLcSteps");
    if (!box) return;
    box.innerHTML = STEPS.map((s) => {
      const cls = ["lq-lc-step"];
      if (s.id === state.step) cls.push("active");
      return `<button type="button" class="${cls.join(" ")}" data-step="${s.id}">${esc(s.label)}</button>`;
    }).join("");
    box.querySelectorAll("[data-step]").forEach((btn) => {
      btn.onclick = () => {
        state.step = btn.getAttribute("data-step");
        paintSteps();
        paintBody();
      };
    });
  }

  function c() {
    return state.contract || {};
  }

  function paintBody() {
    const body = $("#lqLcBody");
    if (!body) return;
    const painters = {
      parties: paintParties,
      finance: paintFinance,
      dossier: paintDossier,
      review: paintReview,
      sign: paintSign,
      activate: paintActivate,
      close: paintClose,
    };
    (painters[state.step] || paintParties)(body);
  }

  function paintParties(body) {
    const props = data("properties");
    const clients = data("clients");
    const cur = c();
    body.innerHTML = `
      <div class="lq-lc-panel">
        <h4>اختيار العميل والوحدة ${cur.id ? `<span class="mini">· ${esc(cur.contract_no || cur.id)}</span>` : ""} ${cur.locked || ["Approved","Active","Signed"].includes(cur.status) ? '<span class="lq-lc-badge-locked">مغلق</span>' : ""}</h4>
        <div class="lq-lc-grid">
          <label>العميل<select id="lcClient">${optionList(clients, "id", (r) => `${r.name || ""} — ${r.phone || ""}`, cur.client_id)}</select></label>
          <label>الوحدة / العقار<select id="lcProperty">${optionList(props, "id", (r) => propertyLabel(r), cur.property_id)}</select></label>
          <label>نوع العقد<select id="lcType">
            <option ${cur.contract_type === "Residential" ? "selected" : ""}>Residential</option>
            <option ${cur.contract_type === "Commercial" ? "selected" : ""}>Commercial</option>
            <option ${cur.contract_type === "Short-Term" ? "selected" : ""}>Short-Term</option>
            <option ${cur.contract_type === "Hospitality" ? "selected" : ""}>Hospitality</option>
          </select></label>
          <label>رقم الهوية / الجواز<input id="lcTenantId" value="${esc(cur.tenant_id_no || "")}"></label>
          <label>الجنسية<input id="lcNationality" value="${esc(cur.tenant_nationality || "")}"></label>
          <label>تفاصيل الوحدة<textarea id="lcUnitDetails" rows="2">${esc(cur.unit_details || "")}</textarea></label>
        </div>
        <div class="lq-lc-actions">
          <button class="gold-btn" type="button" id="lcSaveParties">حفظ ومتابعة</button>
          <button class="ghost" type="button" id="lcLoadExisting">تحميل عقد قائم</button>
        </div>
        <div id="lcExistingBox" class="mini" style="margin-top:10px"></div>
      </div>`;
    $("#lcSaveParties").onclick = () => saveStep("parties", {
      client_id: $("#lcClient").value,
      property_id: $("#lcProperty").value,
      contract_type: $("#lcType").value,
      tenant_id_no: $("#lcTenantId").value.trim(),
      tenant_nationality: $("#lcNationality").value.trim(),
      unit_details: $("#lcUnitDetails").value.trim(),
    }, "finance");
    $("#lcLoadExisting").onclick = () => {
      const rows = data("contracts").slice(0, 40);
      $("#lcExistingBox").innerHTML = `
        <label>اختر عقدًا<select id="lcPickContract">${optionList(rows, "id", (r) => `${r.contract_no || r.id} · ${r.status} · إصدار ${r.edition_no || 1}`, state.contractId)}</select></label>
        <button class="ghost" type="button" id="lcPickBtn">فتح</button>`;
      $("#lcPickBtn").onclick = async () => {
        const id = $("#lcPickContract").value;
        if (!id) return;
        await loadContract(id);
        paintSteps();
        paintBody();
      };
    };
  }

  function paintFinance(body) {
    const cur = c();
    if (!cur.id) {
      body.innerHTML = `<div class="lq-lc-panel"><p class="lq-lc-missing">ابدأ أولًا بخطوة العميل والوحدة.</p></div>`;
      return;
    }
    const schedule = parseJson(cur.payment_schedule_json, []);
    body.innerHTML = `
      <div class="lq-lc-panel">
        <h4>البيانات المالية والمدة</h4>
        <div class="lq-lc-grid">
          <label>تاريخ البداية<input id="lcStart" type="date" value="${esc(cur.start_date || today())}"></label>
          <label>تاريخ النهاية<input id="lcEnd" type="date" value="${esc(cur.end_date || today())}"></label>
          <label>الأجرة الشهرية OMR<input id="lcRent" type="number" step="0.001" value="${esc(cur.rent_amount || "")}"></label>
          <label>دورة الدفع<select id="lcCycle">
            <option value="monthly" ${cur.payment_cycle === "monthly" ? "selected" : ""}>شهري</option>
            <option value="quarterly" ${cur.payment_cycle === "quarterly" ? "selected" : ""}>ربع سنوي</option>
            <option value="yearly" ${cur.payment_cycle === "yearly" ? "selected" : ""}>سنوي</option>
            <option value="once" ${cur.payment_cycle === "once" ? "selected" : ""}>مرة واحدة</option>
          </select></label>
          <label>التأمين<input id="lcDeposit" type="number" step="0.001" value="${esc(cur.deposit_amount || 0)}"></label>
          <label>مهلة السداد (أيام)<input id="lcGrace" type="number" value="${esc(cur.grace_days || 5)}"></label>
          <label>تنبيه التجديد (أيام)<input id="lcRenewDays" type="number" value="${esc(cur.renewal_notice_days || 30)}"></label>
          <label>غرامة/رسوم إدارية معقولة<input id="lcLate" type="number" step="0.001" value="${esc(cur.late_fee || 0)}"></label>
        </div>
        <h4 style="margin-top:16px">جدول الاستحقاقات (يُنشأ تلقائيًا)</h4>
        <div class="table-wrap"><table class="lq-lc-table"><thead><tr><th>#</th><th>الاستحقاق</th><th>المبلغ</th><th>البيان</th></tr></thead>
        <tbody>${
          schedule.length
            ? schedule
                .map(
                  (r) =>
                    `<tr><td>${esc(r.seq)}</td><td>${esc(r.due_date)}</td><td>${money(r.amount)}</td><td>${esc(r.label)}</td></tr>`
                )
                .join("")
            : `<tr><td colspan="4">سيُحسب عند الحفظ</td></tr>`
        }</tbody></table></div>
        <div class="lq-lc-actions">
          <button class="gold-btn" type="button" id="lcSaveFinance">حفظ ومتابعة لملف العقد</button>
        </div>
      </div>`;
    $("#lcSaveFinance").onclick = () =>
      saveStep(
        "finance",
        {
          start_date: $("#lcStart").value,
          end_date: $("#lcEnd").value,
          rent_amount: Number($("#lcRent").value || 0),
          payment_cycle: $("#lcCycle").value,
          deposit_amount: Number($("#lcDeposit").value || 0),
          grace_days: Number($("#lcGrace").value || 5),
          renewal_notice_days: Number($("#lcRenewDays").value || 30),
          late_fee: Number($("#lcLate").value || 0),
        },
        "dossier"
      );
  }

  function paintDossier(body) {
    const cur = c();
    if (!cur.id) {
      body.innerHTML = `<div class="lq-lc-panel"><p class="lq-lc-missing">لا يوجد عقد محمّل.</p></div>`;
      return;
    }
    const handover = parseJson(cur.handover_json, {});
    const furniture = parseJson(cur.furniture_keys_json, { items: [] });
    const meters = parseJson(cur.meter_readings_json, {});
    const photos = parseJson(cur.condition_photos_json, []);
    const terms =
      cur.legal_terms ||
      (window.LQ_LEASE_PROTECTED?.protectedTermsPlainText
        ? window.LQ_LEASE_PROTECTED.protectedTermsPlainText().slice(0, 800) + "…"
        : "");
    body.innerHTML = `
      <div class="lq-lc-panel">
        <h4>مراجعة الشروط وملف العقد (الملاحق الإلزامية)</h4>
        <label>الشروط القانونية المحمية<textarea id="lcTerms" rows="5">${esc(cur.legal_terms || terms)}</textarea></label>
        <div class="lq-lc-grid" style="margin-top:12px">
          <label>محضر الاستلام — التاريخ<input id="lcHandDate" type="date" value="${esc(handover.delivered_at || today())}"></label>
          <label>حالة الوحدة عند التسليم<input id="lcHandCond" value="${esc(handover.condition || "")}" placeholder="جيدة / تحتاج صيانة..."></label>
          <label>سلّم بواسطة<input id="lcHandBy" value="${esc(handover.delivered_by || "")}"></label>
          <label>استلم بواسطة<input id="lcHandRecv" value="${esc(handover.received_by || "")}"></label>
          <label style="grid-column:1/-1">ملاحظات المحضر<textarea id="lcHandNotes" rows="2">${esc(handover.notes || "")}</textarea></label>
        </div>
        <div class="lq-lc-grid" style="margin-top:12px">
          <label>عدد المفاتيح<input id="lcKeys" type="number" value="${esc(furniture.keys_count || 0)}"></label>
          <label>بطاقات الدخول<input id="lcCards" type="number" value="${esc(furniture.access_cards || 0)}"></label>
          <label style="grid-column:1/-1">قائمة الأثاث (سطر لكل عنصر)<textarea id="lcFurniture" rows="3">${esc((furniture.items || []).join("\n"))}</textarea></label>
        </div>
        <div class="lq-lc-grid" style="margin-top:12px">
          <label>قراءة الكهرباء<input id="lcElec" value="${esc(meters.electricity || "")}"></label>
          <label>قراءة المياه<input id="lcWater" value="${esc(meters.water || "")}"></label>
          <label>قراءة الغاز<input id="lcGas" value="${esc(meters.gas || "")}"></label>
          <label>تاريخ القراءة<input id="lcMeterAt" type="date" value="${esc(meters.read_at || today())}"></label>
        </div>
        <div class="lq-lc-grid" style="margin-top:12px">
          <label>صور حالة الوحدة (روابط أو أوصاف، سطر لكل صورة)<textarea id="lcPhotos" rows="3">${esc((photos || []).map((p) => (typeof p === "string" ? p : p.url || p.name || "")).join("\n"))}</textarea></label>
          <label>مرفقات أساسية (هوية / صور / محضر)<input id="lcFiles" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp"></label>
          <label>نوع المرفق<select id="lcDocType">
            <option value="id_copy">نسخة الهوية</option>
            <option value="condition_photos">صور حالة الوحدة</option>
            <option value="handover">محضر استلام</option>
            <option value="furniture_keys">أثاث/مفاتيح</option>
            <option value="meters">عدادات</option>
            <option value="other">أخرى</option>
          </select></label>
        </div>
        <div class="lq-lc-actions">
          <button class="gold-btn" type="button" id="lcSaveDossier">حفظ ملف العقد والمتابعة</button>
          <button class="ghost" type="button" onclick="contractDocument && contractDocument('${esc(cur.id)}')">معاينة العقد للطباعة</button>
        </div>
      </div>`;
    $("#lcSaveDossier").onclick = async () => {
      try {
        const files = Array.from($("#lcFiles")?.files || []);
        const uploads = [];
        for (const f of files.slice(0, 8)) {
          const dataUrl = await readFile(f);
          uploads.push({ image: dataUrl, content_type: f.type, name: f.name, doc_type: $("#lcDocType").value });
        }
        const photoLines = $("#lcPhotos").value
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean)
          .map((url) => ({ url, name: url }));
        const res = await api("contract_dossier", {
          method: "POST",
          body: JSON.stringify({
            contract_id: cur.id,
            handover: {
              delivered_at: $("#lcHandDate").value,
              condition: $("#lcHandCond").value,
              delivered_by: $("#lcHandBy").value,
              received_by: $("#lcHandRecv").value,
              notes: $("#lcHandNotes").value,
            },
            furniture_keys: {
              keys_count: Number($("#lcKeys").value || 0),
              access_cards: Number($("#lcCards").value || 0),
              items: $("#lcFurniture").value.split("\n").map((x) => x.trim()).filter(Boolean),
            },
            meters: {
              electricity: $("#lcElec").value,
              water: $("#lcWater").value,
              gas: $("#lcGas").value,
              read_at: $("#lcMeterAt").value,
            },
            condition_photos: photoLines,
            attachments_upload: uploads,
          }),
        });
        // also save legal terms via lifecycle if draft
        if (!isLocked(res.contract)) {
          await api("contract_lifecycle", {
            method: "POST",
            body: JSON.stringify({
              contract_id: cur.id,
              step: "review",
              payload: { legal_terms: $("#lcTerms").value },
            }),
          });
        }
        state.contract = res.contract;
        state.readiness = res.readiness;
        toast("تم حفظ ملف العقد");
        state.step = "review";
        await loadContract(cur.id);
        paintSteps();
        paintBody();
        if (typeof window.loadAll === "function") await window.loadAll();
      } catch (e) {
        toast(e.message || String(e), true);
      }
    };
  }

  function readinessHtml(gate) {
    if (!gate) return "";
    const dossier = gate.dossier || {};
    const labels = {
      handover: "محضر استلام",
      furniture_keys: "أثاث ومفاتيح",
      meters: "قراءات عدادات",
      condition_photos: "صور حالة الوحدة",
      payment_schedule: "جدول دفعات",
      id_copy: "هوية/جواز",
      signatures: "التوقيعات",
    };
    return `
      <div class="lq-lc-checklist">
        ${Object.keys(labels)
          .map((k) => `<div class="lq-lc-check ${dossier[k] ? "ok" : "bad"}"><span>${labels[k]}</span><b>${dossier[k] ? "مكتمل" : "ناقص"}</b></div>`)
          .join("")}
      </div>
      ${
        (gate.missing || []).length
          ? `<div class="lq-lc-missing">نواقص التفعيل:<br>${gate.missing.map((m) => `• ${esc(m)}`).join("<br>")}</div>`
          : `<p class="mini" style="color:#6ee7b7">جاهز للتفعيل من ناحية البيانات والمستندات.</p>`
      }`;
  }

  function paintReview(body) {
    const cur = c();
    if (!cur.id) {
      body.innerHTML = `<div class="lq-lc-panel"><p class="lq-lc-missing">لا يوجد عقد.</p></div>`;
      return;
    }
    body.innerHTML = `
      <div class="lq-lc-panel">
        <h4>مراجعة وإرسال للاعتماد · الحالة: ${esc(cur.status)} · إصدار ${esc(cur.edition_no || 1)}</h4>
        <p class="mini">${esc(cur.contract_no || cur.id)} · الإيجار ${money(cur.rent_amount)} · ${esc(cur.start_date)} → ${esc(cur.end_date)}</p>
        <div id="lcReadyBox">${readinessHtml(state.readiness)}</div>
        <div class="lq-lc-actions">
          <button class="ghost" type="button" id="lcRefreshReady">تحديث فحص الاكتمال</button>
          <button class="gold-btn" type="button" id="lcRequestApproval">إرسال للاعتماد</button>
          <button class="gold-btn" type="button" id="lcApproveDirect">اعتماد مباشر (صلاحية)</button>
          <button class="ghost" type="button" id="lcAmend">تعديل بإصدار جديد</button>
        </div>
        <h4 style="margin-top:18px">سجل الإجراءات والنسخ</h4>
        <div class="lq-lc-log" id="lcActionLog"></div>
      </div>`;
    paintActionLog();
    $("#lcRefreshReady").onclick = async () => {
      await loadContract(cur.id);
      paintBody();
    };
    $("#lcRequestApproval").onclick = async () => {
      try {
        await api("request_approval", {
          method: "POST",
          body: JSON.stringify({
            entity: "contracts",
            entity_id: cur.id,
            request_type: "contract",
            notes: "طلب اعتماد دورة عقد",
          }),
        });
        toast("تم إرسال طلب الاعتماد");
        await loadContract(cur.id);
        if (typeof window.loadAll === "function") await window.loadAll();
        paintBody();
      } catch (e) {
        toast(e.message || String(e), true);
      }
    };
    $("#lcApproveDirect").onclick = async () => {
      try {
        await api("approve_contract", { method: "POST", body: JSON.stringify({ contract_id: cur.id }) });
        toast("تم اعتماد العقد — أصبح مغلقًا");
        state.step = "sign";
        await loadContract(cur.id);
        if (typeof window.loadAll === "function") await window.loadAll();
        paintSteps();
        paintBody();
      } catch (e) {
        toast(e.message || String(e), true);
      }
    };
    $("#lcAmend").onclick = async () => {
      try {
        const rent = prompt("الأجرة الجديدة (اترك فارغًا للإبقاء)", String(cur.rent_amount || ""));
        const changes = {};
        if (rent != null && rent !== "" && Number(rent) > 0) changes.rent_amount = Number(rent);
        const res = await api("contract_amend", {
          method: "POST",
          body: JSON.stringify({ contract_id: cur.id, changes, request_approval: true }),
        });
        toast(`تم إنشاء الإصدار ${res.contract.edition_no} وإرساله للاعتماد`);
        state.contractId = res.contract.id;
        state.contract = res.contract;
        state.step = "review";
        await loadContract(res.contract.id);
        if (typeof window.loadAll === "function") await window.loadAll();
        paintSteps();
        paintBody();
      } catch (e) {
        toast(e.message || String(e), true);
      }
    };
  }

  function paintSign(body) {
    const cur = c();
    const sig = parseJson(cur.signatures_json, {});
    body.innerHTML = `
      <div class="lq-lc-panel">
        <h4>صفحة التوقيعات</h4>
        <p class="mini">التوقيع متاح بعد الاعتماد. العقد يصبح بحالة Signed ومغلقًا.</p>
        <div class="lq-lc-grid">
          <label>اسم المستأجر<input id="lcSigTenant" value="${esc(sig.tenant_name || "")}"></label>
          <label>ممثل الشركة<input id="lcSigCompany" value="${esc(sig.company_name || cur.company_signatory || "مشاريع جودة الانطلاقة")}"></label>
          <label>الضامن (إن وجد)<input id="lcSigGuar" value="${esc(sig.guarantor_name || "")}"></label>
        </div>
        <div class="lq-lc-actions">
          <button class="gold-btn" type="button" id="lcDoSign">تأكيد التوقيع</button>
          <button class="ghost" type="button" onclick="contractDocument && contractDocument('${esc(cur.id || "")}')">طباعة صفحة التوقيعات</button>
        </div>
      </div>`;
    $("#lcDoSign").onclick = async () => {
      try {
        const res = await api("contract_sign", {
          method: "POST",
          body: JSON.stringify({
            contract_id: cur.id,
            tenant_name: $("#lcSigTenant").value,
            company_name: $("#lcSigCompany").value,
            guarantor_name: $("#lcSigGuar").value,
            tenant_signed: true,
            company_signed: true,
            guarantor_signed: !!$("#lcSigGuar").value,
          }),
        });
        toast("تم توقيع العقد");
        state.contract = res.contract;
        state.step = "activate";
        await loadContract(cur.id);
        paintSteps();
        paintBody();
        if (typeof window.loadAll === "function") await window.loadAll();
      } catch (e) {
        toast(e.message || String(e), true);
      }
    };
  }

  function paintActivate(body) {
    const cur = c();
    body.innerHTML = `
      <div class="lq-lc-panel">
        <h4>التفعيل والإغلاق التشغيلي</h4>
        <p class="mini">بعد التفعيل: الوحدة تُحوَّل إلى مؤجرة، ويُنشأ جدول الاستحقاقات والفواتير تلقائيًا. لا يُسمح بالتفعيل إن نقصت بيانات العميل/العقار/المبالغ/المستندات.</p>
        <div id="lcReadyBox2">${readinessHtml(state.readiness)}</div>
        <div class="lq-lc-actions">
          <button class="ghost" type="button" id="lcRefreshReady2">إعادة الفحص</button>
          <button class="gold-btn" type="button" id="lcActivate">تفعيل العقد الآن</button>
        </div>
      </div>`;
    $("#lcRefreshReady2").onclick = async () => {
      await loadContract(cur.id);
      paintBody();
    };
    $("#lcActivate").onclick = async () => {
      try {
        const res = await api("activate_contract", { method: "POST", body: JSON.stringify({ contract_id: cur.id }) });
        toast(`تم التفعيل وإنشاء ${(res.created_invoices || []).length} فاتورة`);
        state.step = "close";
        await loadContract(cur.id);
        if (typeof window.loadAll === "function") await window.loadAll();
        paintSteps();
        paintBody();
      } catch (e) {
        toast(e.message || String(e), true);
      }
    };
  }

  function paintClose(body) {
    const cur = c();
    const eviction = parseJson(cur.eviction_json, {});
    const finalH = parseJson(cur.final_handover_json, {});
    body.innerHTML = `
      <div class="lq-lc-panel">
        <h4>التجديد · الإنهاء · الإخلاء · التسليم النهائي</h4>
        <div class="lq-lc-actions">
          <button class="gold-btn" type="button" id="lcRenew">تجديد العقد</button>
          <button class="ghost" type="button" id="lcEnd">إنهاء / إلغاء</button>
        </div>
        <h4 style="margin-top:16px">طلب إخلاء</h4>
        <div class="lq-lc-grid">
          <label>سبب الإخلاء<input id="lcEvicReason" value="${esc(eviction.reason || "")}"></label>
          <label>الإخلاء قبل تاريخ<input id="lcEvicBy" type="date" value="${esc(eviction.vacate_by || "")}"></label>
          <label style="grid-column:1/-1">ملاحظات<textarea id="lcEvicNotes" rows="2">${esc(eviction.notes || "")}</textarea></label>
        </div>
        <div class="lq-lc-actions"><button class="ghost" type="button" id="lcEvicSave">حفظ طلب الإخلاء</button></div>
        <h4 style="margin-top:16px">التسليم النهائي</h4>
        <div class="lq-lc-grid">
          <label>تاريخ التسليم<input id="lcFinalAt" type="date" value="${esc(finalH.handed_at || today())}"></label>
          <label>حالة الوحدة<input id="lcFinalCond" value="${esc(finalH.condition || "")}"></label>
          <label>المفاتيح مُعادة؟<select id="lcFinalKeys"><option value="1">نعم</option><option value="0">لا</option></select></label>
          <label style="grid-column:1/-1">الأضرار / التصفية<textarea id="lcFinalNotes" rows="2">${esc(finalH.notes || finalH.damages || "")}</textarea></label>
        </div>
        <div class="lq-lc-actions"><button class="gold-btn" type="button" id="lcFinalSave">تسجيل التسليم النهائي وإغلاق العقد</button></div>
        <h4 style="margin-top:18px">سجل الإجراءات</h4>
        <div class="lq-lc-log" id="lcActionLog"></div>
      </div>`;
    paintActionLog();
    $("#lcRenew").onclick = async () => {
      try {
        const months = prompt("مدة التجديد بالأشهر", "12");
        const res = await api("renew_contract", {
          method: "POST",
          body: JSON.stringify({ contract_id: cur.id, months: Number(months || 12) }),
        });
        toast("تم إنشاء مسودة التجديد");
        state.contractId = res.contract.id;
        state.step = "parties";
        await loadContract(res.contract.id);
        if (typeof window.loadAll === "function") await window.loadAll();
        paintSteps();
        paintBody();
      } catch (e) {
        toast(e.message || String(e), true);
      }
    };
    $("#lcEnd").onclick = async () => {
      try {
        const reason = prompt("سبب الإنهاء", "") || "";
        await api("end_contract", {
          method: "POST",
          body: JSON.stringify({ contract_id: cur.id, reason, status: "Expired" }),
        });
        toast("تم إنهاء العقد");
        await loadContract(cur.id);
        if (typeof window.loadAll === "function") await window.loadAll();
        paintBody();
      } catch (e) {
        toast(e.message || String(e), true);
      }
    };
    $("#lcEvicSave").onclick = async () => {
      try {
        await api("contract_eviction", {
          method: "POST",
          body: JSON.stringify({
            contract_id: cur.id,
            reason: $("#lcEvicReason").value,
            vacate_by: $("#lcEvicBy").value,
            notes: $("#lcEvicNotes").value,
          }),
        });
        toast("تم تسجيل طلب الإخلاء");
        await loadContract(cur.id);
        paintBody();
      } catch (e) {
        toast(e.message || String(e), true);
      }
    };
    $("#lcFinalSave").onclick = async () => {
      try {
        await api("contract_final_handover", {
          method: "POST",
          body: JSON.stringify({
            contract_id: cur.id,
            handed_at: $("#lcFinalAt").value,
            condition: $("#lcFinalCond").value,
            keys_returned: $("#lcFinalKeys").value === "1",
            notes: $("#lcFinalNotes").value,
            end_contract: true,
          }),
        });
        toast("تم التسليم النهائي وإغلاق العقد");
        await loadContract(cur.id);
        if (typeof window.loadAll === "function") await window.loadAll();
        paintBody();
      } catch (e) {
        toast(e.message || String(e), true);
      }
    };
  }

  function paintActionLog() {
    const box = $("#lcActionLog");
    if (!box) return;
    const items = state.actions || [];
    box.innerHTML = items.length
      ? items
          .map(
            (a) =>
              `<div class="lq-lc-log-item"><b>${esc(a.action)}</b> · ${esc(a.actor || "")}<br><span class="mini">${esc(a.created_at || "")}</span><br>${esc(a.details || "")}</div>`
          )
          .join("")
      : `<div class="mini">لا يوجد سجل بعد.</div>`;
  }

  function isLocked(contract) {
    const st = String(contract?.status || "").toLowerCase();
    return !!contract?.locked || ["approved", "active", "activated", "signed"].includes(st);
  }

  async function readFile(file) {
    if (typeof window.readFileAsDataUrl === "function") return window.readFileAsDataUrl(file);
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function saveStep(step, payload, nextStep) {
    try {
      const body = {
        contract_id: state.contractId || undefined,
        step,
        payload,
      };
      const res = await api("contract_lifecycle", { method: "POST", body: JSON.stringify(body) });
      state.contract = res.contract;
      state.contractId = res.contract.id;
      if (res.step_check && !res.step_check.ok) {
        toast("حُفظ مع نواقص: " + (res.step_check.missing || []).join("، "), true);
      } else {
        toast("تم الحفظ");
      }
      if (nextStep) state.step = nextStep;
      await loadContract(state.contractId);
      paintSteps();
      paintBody();
      if (typeof window.loadAll === "function") await window.loadAll();
    } catch (e) {
      toast(e.message || String(e), true);
    }
  }

  async function loadContract(id) {
    const res = await api(`contract_lifecycle?contract_id=${encodeURIComponent(id)}`);
    state.contractId = id;
    state.contract = res.contract;
    state.readiness = res.readiness;
    state.actions = res.actions || [];
    return res;
  }

  function openForContract(contractId) {
    state.contractId = contractId;
    state.step = "review";
    loadContract(contractId)
      .then(() => {
        if (typeof window.showSection === "function") window.showSection("contracts");
        renderShell();
      })
      .catch((e) => toast(e.message || String(e), true));
  }

  function onSection(sectionId) {
    if (sectionId !== "contracts") return;
    const el = host();
    if (!el) return;
    if (!el.dataset.ready) {
      el.dataset.ready = "1";
      renderShell();
    } else if (!el.innerHTML.trim()) {
      renderShell();
    }
  }

  window.LQ_CONTRACT_LIFECYCLE = {
    render: renderShell,
    openForContract,
    onSection,
    loadContract,
    state,
  };

  // Hook showSection if present
  const prevShow = window.showSection;
  if (typeof prevShow === "function") {
    window.showSection = function (id) {
      const r = prevShow.apply(this, arguments);
      try {
        onSection(id);
      } catch (_e) {}
      return r;
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (window.Jawdah?.activeSection === "contracts") onSection("contracts");
  });
})();
