# قائمة الإغلاق النهائي للإنتاج (Go-Live)

## الحالة الحالية المختصرة

- ✅ السيرفر النهائي: سياسة ثابتة معتمدة.
- ✅ تحديث Windows التلقائي: جاهز (manifest + updater + scheduled task).
- ✅ قنوات العقار/العقد/الفاتورة: مفعلة ومختبرة.
- ✅ ملف المثبّت `LaunchQuality-Setup.exe`: جاهز للتحميل من `public/releases/windows/` (يُبنى عبر `scripts/build_windows_installer.sh`).

---

## A) مسار إنشاء ملف المثبّت (مرة واحدة لكل إصدار)

> يُنفَّذ من Linux أو Windows عبر سكربت البناء الجاهز.

### الطريقة الموصى بها (جاهزة الآن)

```bash
./scripts/build_windows_installer.sh 49.1.0
```

الناتج:
- `public/releases/windows/LaunchQuality-Setup.exe`
- `public/releases/windows/latest.json` (مع SHA256)

رابط التحميل المباشر بعد النشر على السيرفر:
- `https://web-production-08d73.up.railway.app/releases/windows/LaunchQuality-Setup.exe`

### طريقة Inno Setup التقليدية (اختيارية)

1. تثبيت **Inno Setup 6** (يتضمن `ISCC.exe`).
2. تجهيز مخرجات التطبيق داخل:
   - `dist/`
   - ويجب أن تحتوي الملف التنفيذي: `LaunchQuality.exe`
3. من جذر المشروع:
   ```powershell
   ISCC.exe scripts\LaunchQuality-Setup.iss
   ```
4. الناتج:
   - `scripts\LaunchQuality-Setup.exe` (أو حسب OutputDir في ملف iss)
5. انقل الملف الناتج إلى أي مسار واضح ثم انشره عبر سكربت النشر:
   ```bash
   python3 scripts/publish_windows_release.py \
     --installer "/path/to/LaunchQuality-Setup.exe" \
     --version "49.1.0"
   ```

---

## B) اعتماد التحديث التلقائي لويندوز

بعد نشر المثبّت بالخطوة السابقة:

1. تحقق من تحديث:
   - `public/releases/windows/latest.json`
   - ويحتوي: `version`, `installer_url`, `sha256`
2. انشر التغييرات على السيرفر.
3. في جهاز Windows مثبت عليه النظام:
   - تحقق من وجود Scheduled Task:
     - `LaunchQuality-AutoUpdate`
4. نفذ تحديثًا يدويًا لمرة التحقق:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "C:\Program Files\LaunchQuality\updater\Update-LaunchQuality.ps1" -Force
   ```

---

## C) إغلاق جاهزية الإنتاج (تشغيل فعلي)

1. ✅ `GET /api/health` = OK
2. ✅ تسجيل الدخول (مالك + محاسب + عمليات)
3. ✅ اختبار عقاري طرف-لطرف:
   - عقار → بناية → شقة محجوزة → تحويل → عقد → فاتورة → تحصيل
4. ✅ QA العقار:
   - من الواجهة: `تشغيل QA العقار خطوة بخطوة`
   - من السكربت: `python3 scripts/estate_qa_local.py`
5. ✅ النسخ الاحتياطي:
   - تشغيل نسخة احتياطية
   - التحقق من سلامة الاسترجاع
6. ✅ طباعة عقد/فاتورة بالشعار
7. ✅ فحص الصلاحيات الحرجة (التحويل/إغلاق العقد/إقفال الشهر)

---

## D) متى يصبح لدينا ملف المثبّت؟

✅ جاهز الآن:
- الملف: `public/releases/windows/LaunchQuality-Setup.exe`
- الإصدار: انظر `public/releases/windows/latest.json`
- إعادة البناء: `./scripts/build_windows_installer.sh <version>`
