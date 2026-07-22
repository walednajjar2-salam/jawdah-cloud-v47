# تشغيل جودة الانطلاقة - دليل رسمي مختصر

## 1) النسخ الاحتياطي قبل أي تعديل

- تم أخذ نسخة احتياطية قبل التعديلات في:
  - `/workspace/backups/prechange-20260721-114833`
- تحتوي على:
  - `jawdah.sqlite3`
  - مجلد `uploads/` (الصور والمرفقات)
  - ملفات الإعداد (`railway.toml`, `render.yaml`, `fly.toml`, `Procfile`)

## 2) مكان قاعدة البيانات الفعلية

- على الخادم (Railway): `/app/data/jawdah.sqlite3`
- داخل البيئة المحلية: `/workspace/data/jawdah.sqlite3`

## 3) هل السيرفر محلي أم استضافة خارجية؟

- النسخة الرسمية الحالية تعمل على استضافة خارجية (Railway):
  - `https://web-production-73fd83.up.railway.app`

## 4) تشغيل السيرفر

```bash
python server.py
```

## 5) مكان حفظ الصور والمرفقات

- `/app/data/uploads/`
  - `properties/`
  - `contracts/`
  - `client_cards/`
  - `payment_proofs/`
  - `work_journal/`

## 6) الاستعادة عند الطوارئ

1. أوقف الخدمة.
2. استبدل قاعدة البيانات بآخر نسخة سليمة:
   - `jawdah.sqlite3`
3. استعد مجلد `uploads`.
4. شغّل الخدمة وتحقق من:
   - `/api/health`
   - تسجيل الدخول
   - لوحة التحكم والـ Timeline

## 7) نسخ احتياطي خارجي تلقائي

- فعّل متغير:
  - `LQ_OFFSITE_BACKUP_URL`
- ثم اختبر النسخ:
  - من الواجهة: "نسخ احتياطي تلقائي الآن"
  - أو API: `POST /api/backup/run`
- التحقق:
  - `GET /api/health`
  - `backup_integrity.ok = true`

## 8) فصل التجريبي عن الرسمي

- متغير النسخة:
  - `LQ_EDITION=official` للإنتاج
  - `LQ_EDITION=trial` للتجريبي
- لا تضف بيانات تجريبية داخل قاعدة الشركة الرسمية.
