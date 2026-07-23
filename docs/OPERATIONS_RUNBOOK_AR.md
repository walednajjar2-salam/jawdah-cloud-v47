# تشغيل جودة الانطلاقة - دليل رسمي تشغيلي

## 1) نسخة احتياطية قبل أي تعديل (تم التنفيذ)

تم إنشاء نسخة احتياطية كاملة قبل أي تعديل إضافي في:

- `/workspace/backups/prechange-20260723-153856`

وتشمل:

- قاعدة البيانات: `jawdah.sqlite3`
- المرفقات والصور: `uploads/`
- النسخ الاحتياطية اليومية الحالية: `data/backups/`
- ملفات إعداد التشغيل:
  - `railway.toml`
  - `render.yaml`
  - `fly.toml`
  - `Procfile`

---

## 2) نسخة تجريبية منفصلة + تحقق سلامة البيانات (تم التنفيذ)

تم إنشاء Sandbox تجريبي منفصل في:

- `/workspace/backups/test-sandbox-20260723-153908`

ويتضمن:

- `data/jawdah.sqlite3` (نسخة مطابقة من القاعدة)
- `data/uploads/` (نسخة المرفقات)

نتيجة التحقق:

- `PRAGMA integrity_check = ok`
- تم اختبار العدّادات الأساسية للجداول وظهرت سليمة.

---

## 3) مكان قاعدة البيانات الفعلية

- داخل بيئة التشغيل الحالية:
  - `/workspace/data/jawdah.sqlite3`
- داخل نشر Railway (عند التشغيل الرسمي هناك):
  - `/app/data/jawdah.sqlite3`

> ملاحظة: البيئة الحالية هي بيئة تنفيذ سحابية للتطوير/التحقق. السيرفر الرسمي للشركة يعتمد على منصة النشر الفعلية (مثل Railway) ما لم يتم نقله إلى سيرفر داخلي خاص.

---

## 4) هل السيرفر رئيسي محلي أم خارجي؟

- الحالة الحالية في المشروع: **استضافة خارجية** (Railway) للنسخة الرسمية.
- إذا رغبت الشركة بجهاز داخلي كسيرفر رئيسي، يلزم اعتماد نشر داخلي (Windows/Linux) مع خدمة تشغيل تلقائي.

---

## 5) مكان حفظ الصور والمرفقات

- المسار العام:
  - `/workspace/data/uploads/` (محلي)
  - `/app/data/uploads/` (Railway runtime)
- أهم المجلدات:
  - `properties/`
  - `estate_images/`
  - `contracts/`
  - `client_cards/`
  - `payment_proofs/`
  - `work_journal/`

---

## 6) استرجاع الطوارئ (Recovery)

1. أوقف الخدمة.
2. استرجع `jawdah.sqlite3` من النسخة الاحتياطية.
3. استرجع مجلد `uploads/`.
4. شغّل الخدمة.
5. تحقق من:
   - `GET /api/health`
   - الدخول للحسابات
   - العقارات/العقود/الفواتير

---

## 7) النسخ الاحتياطي الخارجي + اختبار الاسترجاع

تم توفير أداة:

- `scripts/offsite_backup_restore_verify.py`

وظيفتها:

1. نسخ أحدث Backup يومي إلى مسار خارجي (Offsite mirror).
2. تنفيذ Restore تجريبي من النسخة الخارجية.
3. تشغيل `integrity_check` للتأكد أن النسخة صالحة.

تشغيل الأداة:

```bash
python3 scripts/offsite_backup_restore_verify.py
```

المسارات الافتراضية:

- Offsite mirror: `/workspace/backups/offsite-mirror`
- Restore test: `/workspace/backups/offsite-restore-test`

---

## 8) التشغيل التلقائي بعد إعادة التشغيل

تم تجهيز ملف خدمة systemd:

- `scripts/systemd/launchquality-server.service`

للتفعيل على سيرفر Linux:

```bash
sudo cp scripts/systemd/launchquality-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable launchquality-server
sudo systemctl start launchquality-server
sudo systemctl status launchquality-server
```

---

## 9) فصل التجريبي عن الرسمي

- النسخة الرسمية:
  - `LQ_EDITION=official`
- النسخة التجريبية:
  - `LQ_EDITION=trial`

قاعدة العمل:

- لا يتم إدخال بيانات تجريبية في قاعدة الشركة الرسمية.
- أي اختبار يتم على نسخة sandbox منفصلة أولًا.

---

## 10) قفل الإنتاج + تحديث Windows التلقائي

- مرجع الاعتماد النهائي:
  - `docs/FINAL_SERVER_WINDOWS_AUTUPDATE_AR.md`
- قناة تحديث ويندوز:
  - `public/releases/windows/latest.json`
- سكربت التحديث:
  - `scripts/Update-LaunchQuality.ps1`
- تفعيل Scheduled Task:
  - `scripts/Enable-LaunchQuality-AutoUpdate.ps1`
