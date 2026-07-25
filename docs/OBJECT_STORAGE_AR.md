# التخزين السحابي — العقود والصور (v53)

## ماذا يفعل؟
- يحفظ الملفات **محلياً** كما كان (عقود، صور عقارات، بطاقات هوية، إثبات دفع، يومية العمل)
- ينسخها تلقائياً إلى تخزين متوافق مع S3 (AWS / Cloudflare R2 / MinIO)
- إن اختفى الملف المحلي يسترجعه من السحابة عند الطلب

الروابط في قاعدة البيانات تبقى كما هي: `/uploads/...`

## أين تجده؟
- القائمة → **التخزين والنسخ**
- أو **التوسع المؤسسي** → بطاقة «التخزين السحابي»

## تفعيل على Railway
| المتغير | مطلوب | الوظيفة |
|---------|-------|---------|
| `LQ_OBJECT_STORAGE_ENABLED` | نعم (`1`) | تفعيل المسار |
| `LQ_OBJECT_STORAGE_BUCKET` | نعم | اسم الـ Bucket |
| `LQ_OBJECT_STORAGE_ACCESS_KEY_ID` | نعم* | المفتاح |
| `LQ_OBJECT_STORAGE_SECRET_ACCESS_KEY` | نعم* | السر |
| `LQ_OBJECT_STORAGE_REGION` | اختياري | الافتراضي `auto` |
| `LQ_OBJECT_STORAGE_ENDPOINT_URL` | لـ R2/MinIO | مثال R2: `https://<accountid>.r2.cloudflarestorage.com` |
| `LQ_OBJECT_STORAGE_PREFIX` | اختياري | بادئة داخل الـ Bucket |
| `LQ_OBJECT_STORAGE_LOCAL_FALLBACK` | اختياري | `1` (افتراضي) يبقي النسخة المحلية |

\* يقبل أيضاً `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET`.

## واجهات API (admin)
- `GET /api/storage/object_status`
- `GET /api/storage/object_probe`
- `POST /api/storage/sync_uploads` `{ "confirm": "sync" }` — رفع الملفات المحلية الحالية

## بعد التفعيل
1. أعد النشر
2. افتح `/fresh`
3. التوسع المؤسسي → **فحص التخزين** ثم **مزامنة الملفات الحالية**
