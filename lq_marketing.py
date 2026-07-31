"""Marketing platform content: strategic plan, playbook, and default campaign templates."""

from __future__ import annotations

from typing import Any, Dict, List

MARKETING_PLAN: Dict[str, Any] = {
    "title_ar": "خطة التسويق · Launch Quality LLC",
    "horizon": "90 يوماً (ربع تشغيلي)",
    "vision_ar": "توسيع الوعي بخدمات جودة الانطلاقة في العقارات والمجالس والمحاسبة، وتحويل الاهتمام إلى حجوزات وعقود حقيقية.",
    "pillars": [
        {
            "id": "brand",
            "title_ar": "الهوية والثقة",
            "actions_ar": [
                "توحيد الشعار والرسائل على كل القنوات (واتساب، إنستغرام، Google Maps).",
                "نشر قصص نجاح: عقود مُفعّلة، مجالس منجزة، شفافية محاسبية.",
                "ربط كل إعلان برابط تتبع UTM داخل المنصة.",
            ],
        },
        {
            "id": "realestate",
            "title_ar": "تسويق العقارات",
            "actions_ar": [
                "إبراز الوحدات الشاغرة والمحجوزة قريباً من انتهاء الحجز.",
                "حملات موجهة لنزوى والداخلية: شقق، غرف، محلات.",
                "متابعة كل lead خلال 24 ساعة → زيارة → عرض → عقد.",
            ],
        },
        {
            "id": "hospitality",
            "title_ar": "تسويق المجالس",
            "actions_ar": [
                "الترويج لباقات المجالس وواجب العزاء في المواقع الخارجية.",
                "عروض موسمية (رمضان، الأعياد، المناسبات الوطنية).",
                "تأكيد الحجز بعربون 30% خلال 72 ساعة من أول تواصل.",
            ],
        },
        {
            "id": "accounting",
            "title_ar": "تسويق الخدمات المساندة",
            "actions_ar": [
                "عرض خدمات الوساطة والإدارة العقارية للملاك والمستثمرين.",
                "باقات إدارة محفظة + تقارير مالية شهرية.",
                "محتوى تعليمي: «كيف تختار مستأجراً»، «إقفال شهري صحيح».",
            ],
        },
    ],
    "phases": [
        {
            "weeks": "1–2",
            "title_ar": "التأسيس",
            "goals_ar": ["تجهيز كتالوج الخدمات", "إطلاق 2 حملة", "قاعدة leads نظيفة"],
        },
        {
            "weeks": "3–6",
            "title_ar": "الزخم",
            "goals_ar": ["3 منشورات/أسبوع", "متابعة يومية للـ leads", "تقرير أسبوعي للإدارة"],
        },
        {
            "weeks": "7–12",
            "title_ar": "التحويل",
            "goals_ar": ["رفع معدل التحويل 15%", "حملات إعادة استهداف", "مراجعة ROI"],
        },
    ],
    "kpis": [
        {"key": "leads_new", "label_ar": "Leads جديدة / أسبوع", "target": 10},
        {"key": "response_hours", "label_ar": "زمن الرد الأول (ساعة)", "target": 4},
        {"key": "visit_rate", "label_ar": "نسبة الزيارة من Lead", "target": 40},
        {"key": "conversion_rate", "label_ar": "تحويل Lead → عقد/حجز", "target": 15},
        {"key": "vacant_fill", "label_ar": "ملء الوحدات الشاغرة %", "target": 70},
    ],
}

WEEKLY_PLAYBOOK: List[Dict[str, Any]] = [
    {
        "day_ar": "الأحد",
        "tasks_ar": [
            "مراجعة KPIs الأسبوع السابق في منصة التسويق.",
            "تحديث قائمة الوحدات الشاغرة والعروض النشطة.",
            "جدولة 3 منشورات للأسبوع (عقار + مجلس + نصيحة).",
        ],
    },
    {
        "day_ar": "الاثنين",
        "tasks_ar": [
            "متابعة جميع leads بحالة «جديد» — اتصال أو واتساب.",
            "نشر منشور عقاري (صورة + سعر + موقع + CTA واتساب).",
            "تسجيل نتيجة كل تواصل في سجل Lead.",
        ],
    },
    {
        "day_ar": "الثلاثاء",
        "tasks_ar": [
            "حملة مجالس: باقة مميزة أو عرض موسمي.",
            "إرسال عروض أسعار من كتالوج الخدمات للعملاء المؤهلين.",
        ],
    },
    {
        "day_ar": "الأربعاء",
        "tasks_ar": [
            "محتوى تعليمي (Reel/Story): نصيحة مالك أو مستأجر.",
            "متابعة leads «تم التواصل» — حجز زيارة أو معاينة.",
        ],
    },
    {
        "day_ar": "الخميس",
        "tasks_ar": [
            "تقرير مختصر للإدارة: leads، زيارات، عقود، حجوزات.",
            "تحديث حالة الحملات (نشطة/متوقفة/مكتملة).",
        ],
    },
    {
        "day_ar": "الجمعة–السبت",
        "tasks_ar": [
            "رد سريع على استفسارات نهاية الأسبوع (< 4 ساعات).",
            "تجهيز محتوى الأسبوع القادم.",
        ],
    },
]

CHANNELS = [
    {"id": "whatsapp", "label_ar": "واتساب", "icon": "💬"},
    {"id": "instagram", "label_ar": "إنستغرام", "icon": "📸"},
    {"id": "google_maps", "label_ar": "Google Maps", "icon": "📍"},
    {"id": "referral", "label_ar": "إحالة", "icon": "🤝"},
    {"id": "walk_in", "label_ar": "زيارة مباشرة", "icon": "🚶"},
    {"id": "other", "label_ar": "أخرى", "icon": "📣"},
]

DEFAULT_CAMPAIGN_TEMPLATES: List[Dict[str, Any]] = [
    {
        "name": "ملء الوحدات الشاغرة · نزوى",
        "channel": "instagram",
        "product_line": "realestate",
        "goal": "vacancy_fill",
        "target_audience": "مستأجرون سكنيون في نزوى والداخلية",
        "budget_omr": 50,
    },
    {
        "name": "باقات المجالس · موسم المناسبات",
        "channel": "whatsapp",
        "product_line": "hospitality",
        "goal": "majlis_bookings",
        "target_audience": "عائلات ومنظمي مناسبات",
        "budget_omr": 30,
    },
    {
        "name": "إدارة محافظ عقارية للملاك",
        "channel": "referral",
        "product_line": "realestate",
        "goal": "owner_acquisition",
        "target_audience": "ملاك عقارات متعددة",
        "budget_omr": 0,
    },
]

LEAD_STATUSES = [
    {"id": "new", "label_ar": "جديد"},
    {"id": "contacted", "label_ar": "تم التواصل"},
    {"id": "qualified", "label_ar": "مؤهل"},
    {"id": "visit_scheduled", "label_ar": "زيارة مجدولة"},
    {"id": "won", "label_ar": "تم التحويل"},
    {"id": "lost", "label_ar": "مفقود"},
]
