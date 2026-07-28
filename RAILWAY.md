# Launch Quality LLC — Railway Deploy (Live)

> دليل النشر الحي — جاهزية المنصة **100%** على الإنتاج.

## Live production

| | |
|--|--|
| 🌐 **الموقع** | https://web-production-08d73.up.railway.app |
| 🔄 **تحديث كاش** | https://web-production-08d73.up.railway.app/fresh |
| 🪟 **تطبيق ويندوز** | https://web-production-08d73.up.railway.app/get-windows |
| 🗺️ **خريطة نزوى** | https://www.openstreetmap.org/?mlat=22.9333&mlon=57.5333#map=13/22.9333/57.5333 |
| 📸 **شعار** | https://web-production-08d73.up.railway.app/assets/brand-logo-gold.png |
| 📸 **خلفية الدخول** | https://web-production-08d73.up.railway.app/assets/login-portal-bg.png |
| 📸 **أيقونة** | https://web-production-08d73.up.railway.app/assets/app-icon-512.png |

الإصدار الحالي: **`Launch-Quality-LLC-v68.2-native-apps`** (مثبّت + تطبيقات ويندوز/أندرويد)

## Health check

```text
GET https://web-production-08d73.up.railway.app/api/health
```

المتوقع:

```json
{
  "ok": true,
  "status": "healthy",
  "service": "production",
  "version": "Launch-Quality-LLC-v68.2-native-apps",
  "platform_ready": true,
  "database_engine": "sqlite",
  "offsite": { "enabled": true, "mode": "local-volume" }
}
```

جاهزية المنصة (بعد الدخول):

```text
GET /api/platform_readiness
→ platform_score: 100, platform_ready: true
```

## Quick deploy

1. ادفع المستودع إلى GitHub.
2. Railway → **New Project** → **Deploy from GitHub repo**.
3. Variables:

| Variable | Value |
|----------|--------|
| `JAWDAH_HOST` | `0.0.0.0` |
| `JAWDAH_DATA_DIR` | `/app/data` |

`PORT` يُحقن تلقائياً — لا تضعه يدوياً.

4. **Volumes** → Mount `/app/data` (ضروري لعدم فقدان البيانات).
5. **Settings → Networking → Generate Domain**.

أمر التشغيل: `python server.py` (`Procfile` / `railway.toml`).

## ما هو جاهز بدون إعداد إضافي

- **SQLite** على Volume = قاعدة إنتاج أساسية
- **تخزين محلي دائم** للعقود/الصور على `/app/data/uploads`
- **Off-site محلي** = مرآة نسخ في `/app/data/offsite-mirror`
- **MFA** عبر تطبيق المصادقة (**TOTP**) بدون SMTP
- **أجهزة موثوقة** + تدوير كلمات المرور

## اختياري (يُفعّل تلقائياً عند الربط)

### Railway Bucket (نسخ سحابي إضافي)
1. Create → Bucket  
2. خدمة web → Variables → Variable References → **AWS SDK**  
3. Redeploy  

### PostgreSQL (ظلّي للتحقق فقط)
- أضف `DATABASE_URL` أو `LQ_DATABASE_URL`  
- الواجهة: التوسع المؤسسي → فحص / نسخ ظلّي / تحقق  

### SMTP (بريد OTP إضافي)
- `LQ_SMTP_HOST` / `LQ_SMTP_PORT` / `LQ_SMTP_USER` / `LQ_SMTP_PASS`

## حسابات الفريق

كلمات المرور تُضبط عند أول إنشاء مستخدم ولا تُعاد كتابتها عند كل نشر.  
غيّر كلمات المرور من داخل النظام (تدوير 90 يوماً).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `502` | انتظر النشر؛ راجع logs لـ `python server.py` |
| فقدان بيانات | تأكد Volume على `/app/data` |
| كاش قديم | افتح `/fresh` |
| MFA | استخدم Google Authenticator بعد أول تحدي TOTP |

## UI live checklist

- ✅ روابط الموقع والخريطة والصور أعلاه حية
- ✅ أيقونات حقول الدخول والبحث
- ✅ منصات: عقارات / ضيافة / محاسبة بعد الدخول
- ✅ تطبيق ويندوز من `/get-windows`
