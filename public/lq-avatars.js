/* Launch Quality · Employee photo & Omani avatar system */
(function () {
  "use strict";

  const MAX_BYTES = 2 * 1024 * 1024;
  const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  const ONLINE_MS = 15 * 60 * 1000;

  const FALLBACK_CATALOG = {
    men: Array.from({ length: 12 }, (_, i) => {
      const id = "m" + String(i + 1).padStart(2, "0");
      return { id, label: "أفاتار رجالي " + (i + 1), gender: "men", url: "/assets/avatars/" + id + ".svg" };
    }),
    women: Array.from({ length: 12 }, (_, i) => {
      const id = "w" + String(i + 1).padStart(2, "0");
      return { id, label: "أفاتار نسائي " + (i + 1), gender: "women", url: "/assets/avatars/" + id + ".svg" };
    }),
  };

  let catalog = null;
  let cropState = null;

  function esc(s) {
    return typeof htmlEscape === "function"
      ? htmlEscape(s)
      : String(s || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/"/g, "&quot;");
  }

  function stripNameArticle(token) {
    const t = String(token || "").trim();
    if (t.length > 2 && t.startsWith("ال")) return t.slice(2) || t;
    if (t.length > 3 && t.toLowerCase().startsWith("al-")) return t.slice(3) || t;
    if (t.length > 3 && t.slice(0, 2).toLowerCase() === "al" && t[2] === t[2].toUpperCase() && /[A-Z]/.test(t[2])) {
      return t.slice(2) || t;
    }
    return t;
  }

  function initialsFromName(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) {
      const t = stripNameArticle(parts[0]);
      return t.length > 1 ? t.slice(0, 2) : t[0];
    }
    const family = stripNameArticle(parts[parts.length - 1]);
    const last = (family && family[0]) || parts[parts.length - 1][0];
    return (parts[0][0] + " " + last).trim();
  }

  function peopleIndex() {
    const list = (window.Jawdah && (Jawdah.people || [])) || [];
    const map = new Map();
    list.forEach((p) => {
      if (p.id) map.set(String(p.id), p);
      if (p.username) map.set(String(p.username).toLowerCase(), p);
      if (p.name) map.set("name:" + String(p.name).trim(), p);
    });
    (Jawdah.data && Jawdah.data.users ? Jawdah.data.users : []).forEach((u) => {
      if (u.id && !map.has(String(u.id))) map.set(String(u.id), u);
      if (u.username) map.set(String(u.username).toLowerCase(), u);
    });
    if (Jawdah.user) {
      map.set(String(Jawdah.user.id || ""), Jawdah.user);
      if (Jawdah.user.username) map.set(String(Jawdah.user.username).toLowerCase(), Jawdah.user);
    }
    return map;
  }

  function resolveUser(ref) {
    if (!ref) return null;
    if (typeof ref === "object") return ref;
    const key = String(ref).trim();
    const map = peopleIndex();
    return map.get(key) || map.get(key.toLowerCase()) || map.get("name:" + key) || { name: key, username: key };
  }

  function displayName(user) {
    if (typeof displayUserName === "function") return displayUserName(user);
    return (user && (user.name || user.username)) || "";
  }

  function jobTitle(user) {
    if (!user) return "";
    if (user.job_title) return user.job_title;
    if (typeof displayUserRole === "function") return displayUserRole(user);
    if (typeof roleName === "function") return roleName(user.role);
    return user.role || "";
  }

  function isOnline(user) {
    const ts = user && user.last_login;
    if (!ts) return false;
    const t = Date.parse(String(ts).replace(" ", "T"));
    if (!Number.isFinite(t)) return false;
    return Date.now() - t <= ONLINE_MS;
  }

  function presetUrl(preset) {
    if (!preset) return "";
    const id = String(preset).toLowerCase();
    return "/assets/avatars/" + id + ".svg";
  }

  function avatarSrc(user) {
    const u = resolveUser(user);
    if (!u) return null;
    const type = String(u.avatar_type || "initials").toLowerCase();
    if (type === "upload" && u.avatar_image) return String(u.avatar_image);
    if (type === "preset" && u.avatar_preset) return presetUrl(u.avatar_preset);
    return null;
  }

  function sizeClass(size) {
    if (size === "lg" || size === "large") return "lq-av-lg";
    if (size === "xl") return "lq-av-xl";
    if (size === "sm" || size === "small") return "lq-av-sm";
    return "lq-av-md";
  }

  function avatarHtml(user, opts) {
    const o = opts || {};
    const u = resolveUser(user) || {};
    const name = displayName(u) || u.name || u.username || "";
    const initials = u.initials || initialsFromName(name);
    const src = avatarSrc(u);
    const sz = sizeClass(o.size || "md");
    const clickable = o.clickable ? " lq-av-click" : "";
    const extra = o.className ? " " + o.className : "";
    const title = o.title || name;
    const img = src
      ? `<img src="${esc(src)}" alt="${esc(name)}" loading="lazy" decoding="async">`
      : esc(initials);
    const openAttr = o.clickable ? ` role="button" tabindex="0" data-lq-av-open="1"` : "";
    return `<span class="lq-av ${sz}${clickable}${extra}" title="${esc(title)}"${openAttr}>${img}</span>`;
  }

  function inlinePersonHtml(user, opts) {
    const o = opts || {};
    const u = resolveUser(user) || {};
    const name = displayName(u) || u.name || u.username || "";
    return `<span class="lq-emp-inline">${avatarHtml(u, { size: o.size || "sm" })}<span class="lq-emp-name">${esc(name)}</span></span>`;
  }

  function employeeCardHtml(user, opts) {
    const o = opts || {};
    const u = resolveUser(user) || {};
    const name = displayName(u) || u.name || u.username || "";
    const title = jobTitle(u);
    const online = isOnline(u);
    if (o.compact) {
      return `<div class="lq-emp-card lq-emp-compact">${avatarHtml(u, { size: o.size || "sm" })}<div class="lq-emp-name">${esc(name)}</div></div>`;
    }
    return `<div class="lq-emp-card">
      ${avatarHtml(u, { size: o.size || "lg", clickable: !!o.clickable })}
      <div class="lq-emp-name">${esc(name)}</div>
      <div class="lq-emp-title">${esc(title)}</div>
      <div class="lq-emp-status"><span class="lq-emp-dot ${online ? "on" : ""}"></span>${online ? "متصل" : "غير متصل"}</div>
    </div>`;
  }

  function ensureModal() {
    let el = document.getElementById("lqAvatarModal");
    if (el) return el;
    el = document.createElement("div");
    el.id = "lqAvatarModal";
    el.className = "modal hidden";
    el.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="lqAvTitle"><div id="lqAvatarModalBody"></div></div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      if (e.target === el) closeModal();
    });
    return el;
  }

  function closeModal() {
    const el = document.getElementById("lqAvatarModal");
    if (el) el.classList.add("hidden");
    stopCamera();
    cropState = null;
  }

  function openModal(html) {
    const el = ensureModal();
    const body = document.getElementById("lqAvatarModalBody");
    if (body) body.innerHTML = html;
    el.classList.remove("hidden");
  }

  function mergeUser(partial) {
    if (!Jawdah.user || !partial) return;
    Object.assign(Jawdah.user, partial);
    if (Array.isArray(Jawdah.people)) {
      const idx = Jawdah.people.findIndex((p) => p.id === Jawdah.user.id);
      const pub = {
        id: Jawdah.user.id,
        username: Jawdah.user.username,
        name: Jawdah.user.name,
        role: Jawdah.user.role,
        job_title: Jawdah.user.job_title,
        last_login: Jawdah.user.last_login,
        avatar_type: Jawdah.user.avatar_type,
        avatar_preset: Jawdah.user.avatar_preset,
        avatar_image: Jawdah.user.avatar_image,
        avatar_updated_at: Jawdah.user.avatar_updated_at,
        initials: Jawdah.user.initials || initialsFromName(Jawdah.user.name),
      };
      if (idx >= 0) Jawdah.people[idx] = Object.assign({}, Jawdah.people[idx], pub);
      else Jawdah.people.push(pub);
    }
    if (Array.isArray(Jawdah.data && Jawdah.data.users)) {
      const uidx = Jawdah.data.users.findIndex((p) => p.id === Jawdah.user.id);
      if (uidx >= 0) Object.assign(Jawdah.data.users[uidx], Jawdah.user);
    }
  }

  function refreshChrome() {
    if (typeof applyUserHeader === "function") applyUserHeader();
    if (typeof renderSidebarUser === "function") renderSidebarUser();
    if (typeof renderUsers === "function" && Jawdah.activeSection === "users") renderUsers();
  }

  async function loadCatalog() {
    if (catalog) return catalog;
    try {
      const res = await api("avatars/catalog");
      catalog = res.catalog || FALLBACK_CATALOG;
    } catch (_e) {
      catalog = FALLBACK_CATALOG;
    }
    return catalog;
  }

  function renderSettings() {
    const u = Jawdah.user || {};
    const name = displayName(u);
    const title = jobTitle(u);
    openModal(`
      <div class="lq-av-settings">
        <h2 id="lqAvTitle">الصورة الشخصية</h2>
        <p class="mini">اختر صورة شخصية، أو أفاتارًا عمانيًا جاهزًا، أو الأحرف الأولى من اسمك.</p>
        <div class="lq-av-hero">
          ${avatarHtml(u, { size: "xl" })}
          <div class="lq-emp-name">${esc(name)}</div>
          <div class="lq-emp-title">${esc(title)}</div>
        </div>
        <div class="lq-av-actions">
          <button type="button" class="gold-btn" id="lqAvUploadBtn">رفع صورة</button>
          <button type="button" class="ghost" id="lqAvPresetBtn">اختيار أفاتار</button>
          <button type="button" class="ghost" id="lqAvInitialsBtn">الأحرف الأولى</button>
          <button type="button" class="danger" id="lqAvDeleteBtn">حذف الصورة</button>
        </div>
        <div class="toolbar" style="justify-content:flex-end">
          <button type="button" class="ghost" id="lqAvCloseBtn">إغلاق</button>
        </div>
      </div>`);
    document.getElementById("lqAvCloseBtn")?.addEventListener("click", closeModal);
    document.getElementById("lqAvUploadBtn")?.addEventListener("click", openUploader);
    document.getElementById("lqAvPresetBtn")?.addEventListener("click", openPresetPicker);
    document.getElementById("lqAvInitialsBtn")?.addEventListener("click", async () => {
      try {
        const res = await api("me/avatar", { method: "POST", body: JSON.stringify({ mode: "initials" }) });
        mergeUser(res.user);
        refreshChrome();
        if (typeof toast === "function") toast("تم تفعيل الأحرف الأولى");
        renderSettings();
      } catch (e) {
        if (typeof toastErr === "function") toastErr(e);
      }
    });
    document.getElementById("lqAvDeleteBtn")?.addEventListener("click", async () => {
      if (!confirm("حذف الصورة الحالية والعودة للأحرف الأولى؟")) return;
      try {
        const res = await api("me/avatar", { method: "DELETE", body: JSON.stringify({}) });
        mergeUser(res.user);
        refreshChrome();
        if (typeof toast === "function") toast("تم حذف الصورة");
        renderSettings();
      } catch (e) {
        if (typeof toastErr === "function") toastErr(e);
      }
    });
  }

  function openUploader() {
    openModal(`
      <div class="lq-av-settings">
        <h2>رفع صورة شخصية</h2>
        <p class="mini">ارفع صورة من الجهاز أو التقط بالكاميرا، ثم قصّها داخل الإطار الدائري.</p>
        <div class="lq-av-actions">
          <label class="gold-btn" style="cursor:pointer">
            اختيار ملف
            <input id="lqAvFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
          </label>
          <button type="button" class="ghost" id="lqAvCameraBtn">التقاط بالكاميرا</button>
        </div>
        <div id="lqAvCropHost" class="lq-av-crop-wrap hidden"></div>
        <div class="toolbar" style="justify-content:space-between;margin-top:8px">
          <button type="button" class="ghost" id="lqAvBackBtn">رجوع</button>
          <button type="button" class="gold-btn hidden" id="lqAvSaveCropBtn">حفظ الصورة</button>
        </div>
        <video id="lqAvCamVideo" class="hidden" playsinline autoplay style="max-width:100%;border-radius:16px"></video>
        <canvas id="lqAvCamCanvas" class="hidden"></canvas>
      </div>`);
    document.getElementById("lqAvBackBtn")?.addEventListener("click", () => {
      stopCamera();
      renderSettings();
    });
    document.getElementById("lqAvFile")?.addEventListener("change", async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      try {
        await startCropFromFile(file);
      } catch (e) {
        if (typeof toastErr === "function") toastErr(e);
      }
    });
    document.getElementById("lqAvCameraBtn")?.addEventListener("click", startCamera);
    document.getElementById("lqAvSaveCropBtn")?.addEventListener("click", saveCroppedUpload);
  }

  let camStream = null;

  function stopCamera() {
    if (camStream) {
      try {
        camStream.getTracks().forEach((t) => t.stop());
      } catch (_e) {}
      camStream = null;
    }
    const v = document.getElementById("lqAvCamVideo");
    if (v) {
      v.srcObject = null;
      v.classList.add("hidden");
    }
  }

  async function startCamera() {
    try {
      stopCamera();
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      const v = document.getElementById("lqAvCamVideo");
      if (!v) return;
      v.srcObject = camStream;
      v.classList.remove("hidden");
      const shoot = document.createElement("button");
      shoot.type = "button";
      shoot.className = "gold-btn";
      shoot.textContent = "التقاط";
      shoot.id = "lqAvCaptureBtn";
      v.parentElement.appendChild(shoot);
      shoot.onclick = async () => {
        const c = document.getElementById("lqAvCamCanvas");
        if (!c || !v.videoWidth) return;
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        c.getContext("2d").drawImage(v, 0, 0);
        stopCamera();
        shoot.remove();
        const dataUrl = c.toDataURL("image/jpeg", 0.92);
        await startCropFromDataUrl(dataUrl);
      };
    } catch (e) {
      if (typeof toastErr === "function") toastErr(e, "تعذر فتح الكاميرا");
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file.type || !ALLOWED.includes(file.type.toLowerCase())) {
        reject(new Error("نوع الملف غير مدعوم — JPG/PNG/WebP/GIF فقط"));
        return;
      }
      if (file.size > MAX_BYTES) {
        reject(new Error("حجم الصورة كبير — الحد الأقصى 2MB"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("تعذر قراءة الصورة"));
      reader.readAsDataURL(file);
    });
  }

  async function startCropFromFile(file) {
    const dataUrl = await readFileAsDataUrl(file);
    await startCropFromDataUrl(dataUrl);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("تعذر تحميل الصورة"));
      img.src = src;
    });
  }

  async function startCropFromDataUrl(dataUrl) {
    const host = document.getElementById("lqAvCropHost");
    const saveBtn = document.getElementById("lqAvSaveCropBtn");
    if (!host) return;
    const img = await loadImage(dataUrl);
    host.classList.remove("hidden");
    host.innerHTML = `
      <div class="lq-av-crop-stage"><canvas id="lqAvCropCanvas" width="280" height="280"></canvas></div>
      <div class="lq-av-crop-controls">
        <label>تكبير / تصغير <input id="lqAvZoom" type="range" min="1" max="3" step="0.01" value="1.2"></label>
        <label>تدوير <input id="lqAvRotate" type="range" min="0" max="360" step="1" value="0"></label>
      </div>
      <p class="mini">اسحب الصورة داخل الدائرة لمعاينة القص قبل الحفظ.</p>`;
    if (saveBtn) saveBtn.classList.remove("hidden");

    const canvas = document.getElementById("lqAvCropCanvas");
    cropState = {
      img,
      zoom: 1.2,
      rotate: 0,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      lastX: 0,
      lastY: 0,
      canvas,
    };
    const redraw = () => drawCrop();
    document.getElementById("lqAvZoom")?.addEventListener("input", (e) => {
      cropState.zoom = Number(e.target.value) || 1;
      redraw();
    });
    document.getElementById("lqAvRotate")?.addEventListener("input", (e) => {
      cropState.rotate = Number(e.target.value) || 0;
      redraw();
    });
    const onDown = (x, y) => {
      cropState.dragging = true;
      cropState.lastX = x;
      cropState.lastY = y;
    };
    const onMove = (x, y) => {
      if (!cropState.dragging) return;
      cropState.offsetX += x - cropState.lastX;
      cropState.offsetY += y - cropState.lastY;
      cropState.lastX = x;
      cropState.lastY = y;
      redraw();
    };
    const onUp = () => {
      cropState.dragging = false;
    };
    canvas.addEventListener("mousedown", (e) => onDown(e.clientX, e.clientY));
    window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener(
      "touchstart",
      (e) => {
        const t = e.touches[0];
        if (t) onDown(t.clientX, t.clientY);
      },
      { passive: true }
    );
    canvas.addEventListener(
      "touchmove",
      (e) => {
        const t = e.touches[0];
        if (t) onMove(t.clientX, t.clientY);
      },
      { passive: true }
    );
    canvas.addEventListener("touchend", onUp);
    redraw();
  }

  function drawCrop() {
    if (!cropState || !cropState.canvas) return;
    const canvas = cropState.canvas;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const { img, zoom, rotate, offsetX, offsetY } = cropState;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, size, size);
    ctx.translate(size / 2 + offsetX, size / 2 + offsetY);
    ctx.rotate((rotate * Math.PI) / 180);
    const base = Math.max(size / img.width, size / img.height) * zoom;
    const w = img.width * base;
    const h = img.height * base;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  async function saveCroppedUpload() {
    if (!cropState || !cropState.canvas) return;
    try {
      const blob = await new Promise((resolve) => cropState.canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("تعذر تجهيز الصورة");
      if (blob.size > MAX_BYTES) throw new Error("حجم الصورة بعد القص كبير — قلّل التكبير");
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ""));
        r.onerror = () => reject(new Error("تعذر قراءة الصورة"));
        r.readAsDataURL(blob);
      });
      const res = await api("me/avatar", {
        method: "POST",
        body: JSON.stringify({ mode: "upload", image: dataUrl, content_type: "image/jpeg" }),
      });
      mergeUser(res.user);
      refreshChrome();
      if (typeof toast === "function") toast("تم حفظ الصورة الشخصية");
      renderSettings();
    } catch (e) {
      if (typeof toastErr === "function") toastErr(e);
    }
  }

  async function openPresetPicker() {
    const cat = await loadCatalog();
    let tab = "men";
    let selected = (Jawdah.user && Jawdah.user.avatar_preset) || "";

    function paint() {
      const items = cat[tab] || [];
      const selectedItem = items.find((x) => x.id === selected) || (cat.men || []).concat(cat.women || []).find((x) => x.id === selected);
      openModal(`
        <div class="lq-av-settings">
          <h2>اختيار أفاتار عماني</h2>
          <div class="lq-av-picker-tabs">
            <button type="button" class="${tab === "men" ? "active" : ""}" data-tab="men">رجال</button>
            <button type="button" class="${tab === "women" ? "active" : ""}" data-tab="women">نساء</button>
          </div>
          <div class="lq-av-grid">
            ${items
              .map(
                (a) =>
                  `<button type="button" class="lq-av-pick ${selected === a.id ? "selected" : ""}" data-id="${esc(a.id)}" title="${esc(a.label)}"><img src="${esc(a.url)}" alt="${esc(a.label)}"></button>`
              )
              .join("")}
          </div>
          <div class="lq-av-pick-preview">
            ${
              selectedItem
                ? `<span class="lq-av lq-av-lg"><img src="${esc(selectedItem.url)}" alt=""></span><p class="mini">${esc(selectedItem.label)}</p>`
                : `<p class="mini">اختر أفاتارًا من الشبكة</p>`
            }
          </div>
          <div class="lq-av-actions">
            <button type="button" class="ghost" id="lqAvBackBtn">رجوع</button>
            <button type="button" class="gold-btn" id="lqAvSavePresetBtn" ${selected ? "" : "disabled"}>حفظ</button>
          </div>
        </div>`);
      document.querySelectorAll("#lqAvatarModal [data-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.getAttribute("data-tab");
          paint();
        });
      });
      document.querySelectorAll("#lqAvatarModal .lq-av-pick").forEach((btn) => {
        btn.addEventListener("click", () => {
          selected = btn.getAttribute("data-id");
          paint();
        });
      });
      document.getElementById("lqAvBackBtn")?.addEventListener("click", renderSettings);
      document.getElementById("lqAvSavePresetBtn")?.addEventListener("click", async () => {
        if (!selected) return;
        try {
          const res = await api("me/avatar", {
            method: "POST",
            body: JSON.stringify({ mode: "preset", preset: selected }),
          });
          mergeUser(res.user);
          refreshChrome();
          if (typeof toast === "function") toast("تم تعيين الأفاتار");
          renderSettings();
        } catch (e) {
          if (typeof toastErr === "function") toastErr(e);
        }
      });
    }
    paint();
  }

  function canModerate() {
    const r = String((Jawdah.user && Jawdah.user.role) || "").toLowerCase();
    if (["owner", "admin", "deputy", "manager"].includes(r)) return true;
    if (typeof canManageUsersSection === "function") return canManageUsersSection();
    return false;
  }

  async function moderateRemove(userId) {
    if (!canModerate()) return;
    const reason = prompt("سبب إزالة صورة الموظف:");
    if (reason === null) return;
    if (!String(reason).trim() && !["owner", "admin"].includes(String(Jawdah.user?.role || "").toLowerCase())) {
      if (typeof toastErr === "function") toastErr(new Error("يجب ذكر سبب الإزالة"));
      return;
    }
    try {
      await api("users/" + encodeURIComponent(userId) + "/avatar", {
        method: "DELETE",
        body: JSON.stringify({ reason: String(reason || "").trim() }),
      });
      if (typeof toast === "function") toast("تم إزالة الصورة");
      if (typeof loadAll === "function") await loadAll();
      else if (typeof renderUsers === "function") renderUsers();
    } catch (e) {
      if (typeof toastErr === "function") toastErr(e);
    }
  }

  function applyHeaderAvatar() {
    const host = document.getElementById("avatar");
    if (!host || !Jawdah.user) return;
    const wrap = host.parentElement;
    const html = avatarHtml(Jawdah.user, { size: "md", clickable: true, className: "avatar avatar-pro" });
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const node = tmp.firstElementChild;
    if (!node) return;
    node.id = "avatar";
    host.replaceWith(node);
    node.addEventListener("click", openSettings);
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openSettings();
      }
    });
    if (wrap && wrap.classList.contains("userbox")) {
      wrap.style.cursor = "pointer";
      wrap.title = "إعدادات الصورة الشخصية";
      wrap.onclick = (e) => {
        if (e.target.closest("#logoutBtn")) return;
        openSettings();
      };
    }
  }

  function openSettings() {
    renderSettings();
  }

  function syncPeopleFromBootstrap(res) {
    if (!res) return;
    if (Array.isArray(res.people)) Jawdah.people = res.people;
  }

  window.LQ_AVATARS = {
    initialsFromName,
    avatarHtml,
    inlinePersonHtml,
    employeeCardHtml,
    openSettings,
    applyHeaderAvatar,
    syncPeopleFromBootstrap,
    resolveUser,
    avatarSrc,
    canModerate,
    moderateRemove,
    isOnline,
    jobTitle,
  };

  document.addEventListener("DOMContentLoaded", () => {
    ensureModal();
  });
})();
