# نشر نسخة Windows (ضغطة واحدة)

هذا الدليل للمسؤول غير التقني.

## قبل البدء

يجب أن يكون ملف التثبيت جاهزًا:

- `LaunchQuality-Setup.exe`

## الأمر الوحيد المطلوب

من داخل المشروع شغّل:

```bash
python3 scripts/publish_windows_release.py \
  --installer "/path/to/LaunchQuality-Setup.exe" \
  --version "49.1.0" \
  --notes "Production stable build" \
  --notes "Auto update enabled"
```

## ماذا يفعل هذا الأمر تلقائيًا؟

1. ينسخ ملف التثبيت إلى:
   - `public/releases/windows/LaunchQuality-Setup.exe`
2. يحسب `SHA256` تلقائيًا.
3. يحدّث ملف:
   - `public/releases/windows/latest.json`
4. يجعل أجهزة Windows تكتشف التحديث تلقائيًا عبر `Update-LaunchQuality.ps1`.

## بعد التنفيذ

انشر التحديث على السيرفر (Railway) بنفس المعتاد، وستبدأ أجهزة Windows بالتحديث التلقائي.
