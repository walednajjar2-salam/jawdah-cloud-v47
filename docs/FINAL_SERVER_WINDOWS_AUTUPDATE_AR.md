# الاعتماد النهائي: سيرفر ثابت + تحديث تلقائي لويندوز

## الهدف

- تثبيت سيرفر إنتاج نهائي **ثابت** (لا يتغير تلقائيًا).
- اعتماد تحديث تلقائي لتطبيق Windows عند توفر إصدار جديد.

---

## 1) السيرفر النهائي (ثابت)

### سياسة الثبات

1. لا تستخدم `git pull` تلقائي على السيرفر الإنتاجي.
2. حدّث فقط عبر دورة إصدار رسمية (نسخة جديدة + اختبار + نافذة صيانة).
3. خذ نسخة احتياطية قبل أي ترقية.
4. اعتمد متغير بيئة واضح:
   - `LQ_ENV=production`
   - `LQ_CHANGE_FREEZE=1`

### الخدمة (Linux)

- ملف الخدمة الحالي: `scripts/systemd/launchquality-server.service`
- يوصى بتفعيله كما في دليل التشغيل:
  - `sudo systemctl enable launchquality-server`
  - `sudo systemctl start launchquality-server`

> هذا يضمن استقرار التشغيل بعد كل إعادة تشغيل للسيرفر.

---

## 2) تحديث Windows تلقائي

تم تجهيز العناصر التالية:

1. **قناة إصدار ثابتة** (Manifest):
   - `public/releases/windows/latest.json`
2. **محدّث ذكي**:
   - `scripts/Update-LaunchQuality.ps1`
   - يقرأ `latest.json`
   - يقارن الإصدار الحالي مع الإصدار الأحدث
   - ينزّل المثبّت ويشغّله صامتًا
3. **تفعيل التحديث الدوري تلقائيًا**:
   - `scripts/Enable-LaunchQuality-AutoUpdate.ps1`
   - ينشئ Scheduled Task باسم `LaunchQuality-AutoUpdate`
4. **الـ Installer**:
   - `scripts/LaunchQuality-Setup.iss`
   - صار ينسخ سكربتات التحديث ويُفعّل المهمة التلقائية بعد التثبيت.

---

## 3) تحديث إصدار جديد (طريقة العمل الرسمية)

عند إصدار نسخة جديدة:

1. ارفع `LaunchQuality-Setup.exe` الجديد إلى رابط ثابت.
2. حدّث `public/releases/windows/latest.json`:
   - `version`
   - `installer_url`
   - `sha256` (مستحسن جدًا)
   - أو نفّذ ذلك تلقائيًا بأمر واحد عبر:
     - `scripts/publish_windows_release.py`
3. لا حاجة للتدخل اليدوي على أجهزة الموظفين — ستتحدث تلقائيًا.

---

## 4) ملاحظات اعتماد

- السيرفر ثابت حتى إشعار منك.
- التحديث التلقائي يعمل على عملاء Windows فقط.
- أي تغيير لاحق يكون بإخطارك واعتمادك قبل التنفيذ.
