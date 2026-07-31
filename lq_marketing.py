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

# Three auto-generated marketing waves per week (Sun · Tue · Thu).
WEEKLY_POST_SLOTS: List[Dict[str, Any]] = [
    {"slot_index": 1, "day_offset": 0, "label_ar": "الموجة 1 · الأحد", "theme": "realestate"},
    {"slot_index": 2, "day_offset": 2, "label_ar": "الموجة 2 · الثلاثاء", "theme": "hospitality"},
    {"slot_index": 3, "day_offset": 4, "label_ar": "الموجة 3 · الخميس", "theme": "brand"},
]

SOCIAL_CHANNELS = [
    {"id": "instagram", "label_ar": "إنستغرام", "icon": "📸"},
    {"id": "facebook", "label_ar": "فيسبوك", "icon": "👥"},
    {"id": "whatsapp", "label_ar": "واتساب", "icon": "💬"},
]


def iso_week_key(d) -> str:
    iso = d.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def week_start_sunday(d) -> Any:
    from datetime import timedelta

    days_since_sunday = (d.weekday() + 1) % 7
    return d - timedelta(days=days_since_sunday)


def slot_scheduled_dates(week_start) -> List[Any]:
    from datetime import timedelta

    return [week_start + timedelta(days=slot["day_offset"]) for slot in WEEKLY_POST_SLOTS]


def _wa_link(phone: str) -> str:
    digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
    if digits.startswith("968"):
        num = digits
    elif digits:
        num = "968" + digits.lstrip("0")
    else:
        num = "96898203088"
    return f"https://wa.me/{num}"


def _default_goals(theme: str) -> Dict[str, str]:
    if theme == "realestate":
        return {
            "instagram": "500+ وصول · 25 حفظ · 8 رسائل DM · 3 Leads",
            "facebook": "400+ وصول · 12 تفاعل · 6 مشاركات · 2 Leads",
            "whatsapp": "20 إرسال broadcast · 10 ردود · 4 Leads مسجّلة",
        }
    if theme == "hospitality":
        return {
            "instagram": "450+ وصول · 20 حفظ · 6 استفسارات · 2 حجوزات",
            "facebook": "350+ وصول · 15 تفاعل · 5 مشاركات · 1 حجز",
            "whatsapp": "18 إرسال · 12 ردود · 3 عروض أسعار · 1 عربون",
        }
    return {
        "instagram": "400+ وصول · 30 حفظ · 10 تفاعلات · تعزيز الثقة",
        "facebook": "300+ وصول · 20 تفاعل · 8 مشاركات · 5 Leads",
        "whatsapp": "15 إرسال · 8 ردود · 2 Leads · متابعة العملاء",
    }


def generate_weekly_post_bundle(context: Dict[str, Any], slot_index: int, scheduled_date: str) -> Dict[str, Any]:
    slot = next((s for s in WEEKLY_POST_SLOTS if s["slot_index"] == slot_index), WEEKLY_POST_SLOTS[0])
    theme = str(slot.get("theme") or "brand")
    company = str(context.get("company_name") or "مشاريع جودة الانطلاقة")
    location = str(context.get("address") or "نزوى — حي التراث")
    wa = str(context.get("whatsapp") or "98203088")
    wa_url = _wa_link(wa)
    vacant = int(context.get("vacant_units") or 0)
    unit_name = str(context.get("featured_unit_name") or "وحدة سكنية مميزة")
    unit_rent = context.get("featured_unit_rent")
    rent_txt = f"{unit_rent} ر.ع" if unit_rent not in (None, "", 0) else "اتصل للاستفسار"
    majlis_note = str(context.get("majlis_hook") or "باقات مجالس خارجية وواجب عزاء")

    goals = _default_goals(theme)
    title = slot.get("label_ar") or f"موجة {slot_index}"

    if theme == "realestate":
        suggestion = f"ترويج {vacant or '—'} وحدة شاغرة · {unit_name}"
        ig = (
            f"🏢 {company}\n"
            f"✨ {unit_name} — متاحة الآن في {location}\n"
            f"💰 الإيجار: {rent_txt}\n"
            f"📍 نزوى · معاينة بموعد\n"
            f"📲 واتساب: {wa}\n"
            f"#نزوى #عقارات_عمان #إيجار #LaunchQuality #جودة_الانطلاقة #شقة_للإيجار"
        )
        fb = (
            f"{company} — فرصة إيجار في {location}.\n\n"
            f"• الوحدة: {unit_name}\n"
            f"• السعر: {rent_txt}\n"
            f"• الوحدات الشاغرة حالياً: {vacant}\n\n"
            f"للمعاينة والحجز تواصل معنا عبر واتساب {wa} أو زر موقعنا.\n"
            f"إدارة عقارية موثوقة · Launch Quality LLC"
        )
        wa_post = (
            f"السلام عليكم 🌟\n"
            f"*{company}*\n\n"
            f"🏢 *{unit_name}* متاحة للإيجار — {location}\n"
            f"💰 *{rent_txt}*\n"
            f"📅 معاينة اليوم/غداً حسب الموعد\n\n"
            f"↩️ رد بـ *مهتم* أو *معاينة* وسنتابع فوراً (هدف الرد ≤ 4 ساعات)\n"
            f"🔗 {wa_url}"
        )
        product_line = "realestate"
    elif theme == "hospitality":
        suggestion = f"حملة مجالس · {majlis_note}"
        ig = (
            f"🏨 {company}\n"
            f"🎉 {majlis_note}\n"
            f"📍 مجالس خارجية — ليست غرفاً · خدمة في موقعكم\n"
            f"💳 عربون 30% · تأكيد قبل 72 ساعة\n"
            f"📲 {wa}\n"
            f"#مجالس #نزوى #مناسبات #عزاء #LaunchQuality #ضيافة_عمان"
        )
        fb = (
            f"{company} — خدمة مجالس ومناسبات خارجية.\n\n"
            f"• {majlis_note}\n"
            f"• تنفيذ في موقع العميل (مجلس خارجي)\n"
            f"• عربون 30% للتأكيد\n\n"
            f"اطلب عرض السعر: واتساب {wa}\n"
            f"فريق Launch Quality LLC جاهز لخدمتكم."
        )
        wa_post = (
            f"السلام عليكم 🏨\n"
            f"*{company} — منصة المجالس*\n\n"
            f"🎊 {majlis_note}\n"
            f"📍 *مجلس خارجي* في موقعكم — ليس فندقاً ولا وحدة عقارية\n"
            f"💳 عربون *30%* · تأكيد قبل *72 ساعة*\n\n"
            f"↩️ رد بـ *عرض* + عدد الضيوف + التاريخ\n"
            f"🔗 {wa_url}"
        )
        product_line = "hospitality"
    else:
        suggestion = "بناء الثقة · خدمات إدارة عقارية ومحاسبة"
        ig = (
            f"✨ {company}\n"
            f"📋 إدارة عقارات · مجالس · محاسبة — منصة واحدة\n"
            f"📍 {location}\n"
            f"💡 نصيحة: تابع Leads خلال 4 ساعات لرفع التحويل 15%+\n"
            f"📲 {wa}\n"
            f"#LaunchQuality #جودة_الانطلاقة #إدارة_عقارات #نزوى #خدمات_عمان"
        )
        fb = (
            f"لماذا {company}؟\n\n"
            f"✅ إدارة عقارية شفافة\n"
            f"✅ مجالس خارجية منظمة\n"
            f"✅ محاسبة وتحصيل موثّق\n\n"
            f"📍 {location} · ⏰ 08:00–19:00\n"
            f"تواصل: واتساب {wa}\n"
            f"Launch Quality LLC — جودة الانطلاقة"
        )
        wa_post = (
            f"*{company}* 🤝\n\n"
            f"نقدّم:\n"
            f"🏢 إدارة وتأجير عقارات\n"
            f"🏨 مجالس ومناسبات خارجية\n"
            f"💼 خدمات محاسبية وتحصيل\n\n"
            f"📍 {location}\n"
            f"↩️ رد بـ *استفسار* + نوع الخدمة (عقار/مجلس/محاسبة)\n"
            f"🔗 {wa_url}"
        )
        product_line = "both"

    return {
        "week_key": context.get("week_key") or "",
        "slot_index": slot_index,
        "suggestion_title": suggestion,
        "slot_label": title,
        "product_line": product_line,
        "scheduled_date": scheduled_date,
        "goal_instagram": goals["instagram"],
        "goal_facebook": goals["facebook"],
        "goal_whatsapp": goals["whatsapp"],
        "post_instagram": ig.strip(),
        "post_facebook": fb.strip(),
        "post_whatsapp": wa_post.strip(),
        "status": "auto_generated",
    }
