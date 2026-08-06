"""Al-Najjar & Al-Sumoom Auto Trading — النجار والسموم لتجارة واستيراد السيارات."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent
SEED_PATH = BASE_DIR / "public" / "auto-trading" / "seed_vehicles.json"

COMPANY_PROFILE: Dict[str, Any] = {
    "name_ar": "النجار والسموم للتجارة — سيارات مستعملة ومستوردة",
    "name_en": "NAJJAR & AL SAMOOM TRADING",
    "tagline_en": "USED & IMPORTED CARS",
    "bank_account_name_en": "Al Najjar Trading",
    "activity_ar": "تجارة واستيراد السيارات — مستعمل ومستورد",
    "activity_en": "Used & imported cars",
    "motto_ar": "سيارتك بثقة — من الاستيراد إلى التسليم",
    "address_ar": "محافظة الداخلية — نزوى — الفلج",
    "address_en": "Al-Dakhilia Governorate · Nizwa · Falaj",
    "country_ar": "سلطنة عُمان",
    "hours": "08:00 — 20:00",
    "logo_url": "/auto-trading/assets/logo-al-najjar.svg",
    "logo_mark_url": "/auto-trading/assets/logo-mark.svg",
    "phones": {
        "owner": "71924089",
        "whatsapp_1": "71924089",
        "whatsapp_2": "93391994",
        "hamad": "77548482",
        "hamad_intl": "+96877548482",
        "office": "95551994",
    },
    "contacts": [
        {"label_ar": "وليد — واتساب", "phone": "71924089", "note": "+968 71924089", "whatsapp": True},
        {"label_ar": "المبيعات — واتساب", "phone": "93391994", "note": "+968 93391994", "whatsapp": True},
        {"label_ar": "حمد", "phone": "77548482", "note": "+968 7754 8482"},
        {"label_ar": "المكتب", "phone": "95551994", "note": "+968 9555 1994"},
    ],
    "bank": {
        "name_ar": "بنك صحار الدولي",
        "name_en": "Sohar International Bank",
        "account_name_en": "Al Najjar Trading",
        "account_number": "234020022484",
        "swift": "BSHROMRUXXX",
        "iban": "OM070300000234020022484",
    },
    "staff": [
        {"name_ar": "وليد نجار", "username": "waleed.najjar", "role": "owner", "role_ar": "مالك", "phone": "71924089"},
        {"name_ar": "حمد السموم", "username": "hamad.sumoom", "role": "owner", "role_ar": "مالك", "phone": "77548482"},
        {"name_ar": "واية الشعيلي", "username": "waya.shuaili", "role": "sales", "role_ar": "مبيعات", "phone": ""},
        {"name_ar": "رزان الشعيلي", "username": "razan.shuaili", "role": "user", "role_ar": "مستخدم", "phone": ""},
    ],
    "platforms": [
        {"id": "america", "label_ar": "أمريكا", "icon": "🇺🇸", "kind": "auctions", "tags": ["Copart", "IAAI"]},
        {"id": "salam", "label_ar": "سلام أوتو كار", "icon": "🚗", "kind": "partner"},
        {"id": "oman", "label_ar": "عُمان", "icon": "🇴🇲", "kind": "inventory"},
        {"id": "dubai", "label_ar": "دبي", "icon": "🇦🇪", "kind": "import"},
        {"id": "jordan", "label_ar": "الأردن", "icon": "🇯🇴", "kind": "import"},
        {"id": "iran", "label_ar": "إيران", "icon": "🇮🇷", "kind": "import"},
        {"id": "india", "label_ar": "الهند", "icon": "🇮🇳", "kind": "import"},
        {"id": "saudi", "label_ar": "السعودية", "icon": "🇸🇦", "kind": "import"},
    ],
}

VALID_STATUSES = {"متاحة", "محجوزة", "مباعة", "قيد الاستيراد", "صيانة"}
EDITABLE_VEHICLE_FIELDS = (
    "status", "list_price", "purchase_cost", "plate_no", "license_valid_until",
    "insurance_company", "insurance_policy", "insurance_type", "buyer_name", "buyer_phone",
    "import_ref", "origin_country", "notes", "reserved_by", "reserved_until",
    "seller_name", "seller_phone", "seller_id", "purchase_date",
)
LOCKED_VEHICLE_FIELDS = ("stock_no", "make", "model", "variant", "vin", "engine_no", "year")
EXPENSE_CATEGORIES = (
    "شحن واستيراد", "جمارك وترخيص", "صيانة وتجهيز", "تنظيف وتجميل", "عمولات ووسطاء",
    "إيجار ومكتب", "رواتب", "وقود وتنقل", "تأمين", "أخرى",
)


def now_iso() -> str:
    return datetime.now().replace(microsecond=0).isoformat()


def _ensure_vehicle_columns(db: sqlite3.Connection) -> None:
    for col, typ in (
        ("first_registration", "TEXT"),
        ("license_doc_no", "TEXT"),
        ("insurance_type", "TEXT"),
        ("license_source", "TEXT"),
        ("mortgage", "TEXT"),
        ("sort_order", "INTEGER NOT NULL DEFAULT 999"),
        ("seller_name", "TEXT"),
        ("seller_phone", "TEXT"),
        ("seller_id", "TEXT"),
        ("purchase_date", "TEXT"),
    ):
        try:
            db.execute(f"ALTER TABLE at_vehicles ADD COLUMN {col} {typ}")
        except sqlite3.OperationalError:
            pass


def _vehicle_row_from_seed(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "stock_no": item["stock_no"],
        "make": item["make"],
        "model": item["model"],
        "variant": item.get("variant", ""),
        "vehicle_type": item.get("vehicle_type", ""),
        "color": item.get("color", ""),
        "year": item.get("year"),
        "vin": item.get("vin", ""),
        "engine_no": item.get("engine_no", ""),
        "engine_cc": item.get("engine_cc", ""),
        "seats": item.get("seats"),
        "axles": item.get("axles"),
        "origin_country": item.get("origin_country", ""),
        "import_ref": item.get("import_ref", ""),
        "purchase_cost": float(item.get("purchase_cost") or 0),
        "list_price": float(item.get("list_price") or 0),
        "status": item.get("status", "متاحة"),
        "plate_no": item.get("plate_no", ""),
        "license_valid_until": item.get("license_valid_until", ""),
        "first_registration": item.get("first_registration", ""),
        "license_doc_no": item.get("license_doc_no", ""),
        "insurance_company": item.get("insurance_company", ""),
        "insurance_policy": item.get("insurance_policy", ""),
        "insurance_type": item.get("insurance_type", ""),
        "license_source": item.get("license_source", ""),
        "mortgage": item.get("mortgage", ""),
        "notes": item.get("notes", ""),
        "sort_order": int(item.get("sort_order") or 999),
    }


def sync_seed_vehicles(db: sqlite3.Connection) -> None:
    """Upsert reference vehicles from seed file (license / office data)."""
    if not SEED_PATH.exists():
        return
    rows = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        return
    seed_stocks = {str(r.get("stock_no") or "") for r in rows if r.get("stock_no")}
    seed_vins = {str(r.get("vin") or "") for r in rows if r.get("vin")}
    for idx, item in enumerate(rows, start=1):
        if not item.get("stock_no") or not item.get("make") or not item.get("model"):
            continue
        if not item.get("sort_order"):
            item["sort_order"] = idx
        row = _vehicle_row_from_seed(item)
        existing = None
        if row["vin"]:
            existing = db.execute("SELECT id, stock_no FROM at_vehicles WHERE vin=?", (row["vin"],)).fetchone()
        if not existing:
            existing = db.execute(
                "SELECT id, stock_no FROM at_vehicles WHERE stock_no=?",
                (row["stock_no"],),
            ).fetchone()
        if existing:
            db.execute(
                """UPDATE at_vehicles SET
                    stock_no=?, make=?, model=?, variant=?, vehicle_type=?, color=?, year=?, vin=?, engine_no=?,
                    engine_cc=?, seats=?, axles=?, origin_country=?, import_ref=?, purchase_cost=?, list_price=?,
                    status=?, plate_no=?, license_valid_until=?, first_registration=?, license_doc_no=?,
                    insurance_company=?, insurance_policy=?, insurance_type=?, license_source=?, mortgage=?, notes=?,
                    sort_order=?, updated_at=?
                WHERE id=?""",
                (
                    row["stock_no"], row["make"], row["model"], row["variant"], row["vehicle_type"], row["color"],
                    row["year"], row["vin"], row["engine_no"], row["engine_cc"], row["seats"], row["axles"],
                    row["origin_country"], row["import_ref"], row["purchase_cost"], row["list_price"], row["status"],
                    row["plate_no"], row["license_valid_until"], row["first_registration"], row["license_doc_no"],
                    row["insurance_company"], row["insurance_policy"], row["insurance_type"], row["license_source"],
                    row["mortgage"], row["notes"], row["sort_order"], now_iso(), existing[0],
                ),
            )
        else:
            db.execute(
                """INSERT INTO at_vehicles(
                    stock_no, make, model, variant, vehicle_type, color, year, vin, engine_no,
                    engine_cc, seats, axles, origin_country, import_ref, purchase_cost, list_price,
                    status, plate_no, license_valid_until, first_registration, license_doc_no,
                    insurance_company, insurance_policy, insurance_type, license_source, mortgage, notes,
                    sort_order, created_at, updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    row["stock_no"], row["make"], row["model"], row["variant"], row["vehicle_type"], row["color"],
                    row["year"], row["vin"], row["engine_no"], row["engine_cc"], row["seats"], row["axles"],
                    row["origin_country"], row["import_ref"], row["purchase_cost"], row["list_price"], row["status"],
                    row["plate_no"], row["license_valid_until"], row["first_registration"], row["license_doc_no"],
                    row["insurance_company"], row["insurance_policy"], row["insurance_type"], row["license_source"],
                    row["mortgage"], row["notes"], row["sort_order"], now_iso(), now_iso(),
                ),
            )
    # Remove old demo stock rows not in official seed (keep sold history).
    demo_stocks = ("AT-001", "AT-002", "AT-003", "AT-004", "AT-005")
    for code in demo_stocks:
        if code in seed_stocks:
            continue
        db.execute(
            "DELETE FROM at_vehicles WHERE stock_no=? AND lower(status) NOT IN ('مباعة','sold')",
            (code,),
        )
    # Drop duplicate VIN rows that are not in seed file (demo duplicates).
    if seed_vins:
        placeholders = ",".join("?" for _ in seed_vins)
        db.execute(
            f"DELETE FROM at_vehicles WHERE vin != '' AND vin NOT IN ({placeholders}) "
            f"AND stock_no LIKE 'AT-%' AND lower(status) NOT IN ('مباعة','sold')",
            tuple(seed_vins),
        )
    db.commit()


def ensure_tables(db: sqlite3.Connection) -> None:
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS at_vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stock_no TEXT NOT NULL UNIQUE,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            variant TEXT,
            vehicle_type TEXT,
            color TEXT,
            year INTEGER,
            vin TEXT,
            engine_no TEXT,
            engine_cc TEXT,
            seats INTEGER,
            axles INTEGER,
            origin_country TEXT,
            import_ref TEXT,
            purchase_cost REAL NOT NULL DEFAULT 0,
            list_price REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'متاحة',
            plate_no TEXT,
            license_valid_until TEXT,
            insurance_company TEXT,
            insurance_policy TEXT,
            buyer_name TEXT,
            buyer_phone TEXT,
            reserved_by TEXT,
            reserved_until TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS at_import_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT NOT NULL UNIQUE,
            origin_country TEXT NOT NULL,
            supplier TEXT,
            vehicle_count INTEGER NOT NULL DEFAULT 1,
            total_cost REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'قيد الشحن',
            eta_date TEXT,
            arrival_date TEXT,
            notes TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS at_sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_no TEXT NOT NULL UNIQUE,
            vehicle_id INTEGER NOT NULL REFERENCES at_vehicles(id),
            stock_no TEXT NOT NULL,
            buyer_name TEXT NOT NULL,
            buyer_phone TEXT,
            buyer_id TEXT,
            sale_price REAL NOT NULL,
            deposit_amount REAL NOT NULL DEFAULT 0,
            payment_method TEXT,
            sale_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'مكتمل',
            notes TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS at_purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            purchase_no TEXT NOT NULL UNIQUE,
            vehicle_id INTEGER REFERENCES at_vehicles(id),
            stock_no TEXT,
            seller_name TEXT NOT NULL,
            seller_phone TEXT,
            seller_id TEXT,
            source_country TEXT,
            purchase_price REAL NOT NULL DEFAULT 0,
            paid_amount REAL NOT NULL DEFAULT 0,
            payment_method TEXT,
            purchase_date TEXT NOT NULL,
            notes TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS at_expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expense_no TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL,
            vehicle_id INTEGER REFERENCES at_vehicles(id),
            stock_no TEXT,
            amount REAL NOT NULL DEFAULT 0,
            payee TEXT,
            expense_date TEXT NOT NULL,
            payment_method TEXT,
            notes TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS at_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            display_name TEXT,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            details TEXT,
            created_at TEXT NOT NULL
        );
        """
    )
    _ensure_vehicle_columns(db)
    sync_seed_vehicles(db)


def _audit(db: sqlite3.Connection, user: Dict[str, Any], action: str, entity_type: str, entity_id: str = "", details: Any = None) -> None:
    if isinstance(details, dict):
        details = json.dumps(details, ensure_ascii=False)
    db.execute(
        "INSERT INTO at_audit(user_id, display_name, action, entity_type, entity_id, details, created_at) VALUES(?,?,?,?,?,?,?)",
        (
            str(user.get("id") or user.get("username") or ""),
            str(user.get("display_name") or user.get("name") or user.get("username") or "النظام"),
            action,
            entity_type,
            str(entity_id),
            details or "",
            now_iso(),
        ),
    )


def _next_sale_no(db: sqlite3.Connection) -> str:
    n = db.execute("SELECT COUNT(*) FROM at_sales").fetchone()[0] + 1
    return f"AT-S-{datetime.now().year}-{n:04d}"


def _next_import_no(db: sqlite3.Connection) -> str:
    n = db.execute("SELECT COUNT(*) FROM at_import_orders").fetchone()[0] + 1
    return f"AT-I-{datetime.now().year}-{n:04d}"


def _next_purchase_no(db: sqlite3.Connection) -> str:
    n = db.execute("SELECT COUNT(*) FROM at_purchases").fetchone()[0] + 1
    return f"AT-P-{datetime.now().year}-{n:04d}"


def _next_expense_no(db: sqlite3.Connection) -> str:
    n = db.execute("SELECT COUNT(*) FROM at_expenses").fetchone()[0] + 1
    return f"AT-E-{datetime.now().year}-{n:04d}"


def handle_api(
    db: sqlite3.Connection,
    method: str,
    parts: List[str],
    query: Dict[str, List[str]],
    payload: Dict[str, Any],
    user: Dict[str, Any],
    send_json: Callable[..., None],
) -> bool:
    """Handle /api/auto-trading/* routes. parts begins after 'auto-trading'."""
    ensure_tables(db)
    if not parts:
        return send_json({
            "ok": True,
            "portal": "autotrading",
            "label": COMPANY_PROFILE["name_ar"],
            "company": COMPANY_PROFILE,
        }) or True

    head = parts[0]

    if head == "company" and method == "GET":
        return send_json({"ok": True, "company": COMPANY_PROFILE}) or True

    if head == "dashboard" and method == "GET":
        stats = {
            "total_vehicles": db.execute("SELECT COUNT(*) FROM at_vehicles").fetchone()[0],
            "available": db.execute("SELECT COUNT(*) FROM at_vehicles WHERE status='متاحة'").fetchone()[0],
            "reserved": db.execute("SELECT COUNT(*) FROM at_vehicles WHERE status='محجوزة'").fetchone()[0],
            "sold": db.execute("SELECT COUNT(*) FROM at_vehicles WHERE status='مباعة'").fetchone()[0],
            "importing": db.execute("SELECT COUNT(*) FROM at_vehicles WHERE status='قيد الاستيراد'").fetchone()[0],
            "service": db.execute("SELECT COUNT(*) FROM at_vehicles WHERE status='صيانة'").fetchone()[0],
            "stock_value": db.execute(
                "SELECT COALESCE(SUM(list_price),0) FROM at_vehicles WHERE status IN ('متاحة','محجوزة')"
            ).fetchone()[0],
            "sales_count": db.execute("SELECT COUNT(*) FROM at_sales").fetchone()[0],
            "sales_total": db.execute("SELECT COALESCE(SUM(sale_price),0) FROM at_sales").fetchone()[0],
            "pending_imports": db.execute(
                "SELECT COUNT(*) FROM at_import_orders WHERE status NOT IN ('مستلم','ملغي')"
            ).fetchone()[0],
            "purchases_count": db.execute("SELECT COUNT(*) FROM at_purchases").fetchone()[0],
            "purchases_total": db.execute("SELECT COALESCE(SUM(purchase_price),0) FROM at_purchases").fetchone()[0],
            "expenses_count": db.execute("SELECT COUNT(*) FROM at_expenses").fetchone()[0],
            "expenses_total": db.execute("SELECT COALESCE(SUM(amount),0) FROM at_expenses").fetchone()[0],
        }
        stats["net_profit"] = float(stats["sales_total"]) - float(stats["purchases_total"]) - float(stats["expenses_total"])
        today = datetime.now().strftime("%Y-%m-%d")
        stats["today_purchases"] = db.execute(
            "SELECT COUNT(*) FROM at_purchases WHERE purchase_date=?", (today,)
        ).fetchone()[0]
        stats["today_sales"] = db.execute(
            "SELECT COUNT(*) FROM at_sales WHERE sale_date=?", (today,)
        ).fetchone()[0]
        stats["today_expenses"] = db.execute(
            "SELECT COUNT(*) FROM at_expenses WHERE expense_date=?", (today,)
        ).fetchone()[0]
        recent = db.execute("SELECT * FROM at_audit ORDER BY id DESC LIMIT 12").fetchall()
        return send_json({"ok": True, "stats": stats, "recent": [dict(r) for r in recent], "company": COMPANY_PROFILE}) or True

    if head == "vehicles" and method == "GET" and len(parts) == 1:
        status_filter = (query.get("status") or [""])[0].strip()
        make_filter = (query.get("make") or [""])[0].strip()
        sql = "SELECT * FROM at_vehicles WHERE 1=1"
        params: List[Any] = []
        if status_filter:
            sql += " AND status=?"
            params.append(status_filter)
        if make_filter:
            sql += " AND make=?"
            params.append(make_filter)
        sql += " ORDER BY sort_order ASC, stock_no ASC"
        rows = db.execute(sql, params).fetchall()
        makes = [r[0] for r in db.execute("SELECT DISTINCT make FROM at_vehicles ORDER BY make").fetchall()]
        return send_json({"ok": True, "vehicles": [dict(r) for r in rows], "makes": makes}) or True

    if head == "vehicles" and len(parts) == 2 and method == "GET":
        try:
            vehicle_id = int(parts[1])
        except ValueError:
            return send_json({"ok": False, "error": "رقم المركبة غير صحيح"}, 400) or True
        row = db.execute("SELECT * FROM at_vehicles WHERE id=?", (vehicle_id,)).fetchone()
        if not row:
            return send_json({"ok": False, "error": "المركبة غير موجودة"}, 404) or True
        sales = db.execute("SELECT * FROM at_sales WHERE vehicle_id=? ORDER BY id DESC", (vehicle_id,)).fetchall()
        return send_json({"ok": True, "vehicle": dict(row), "sales": [dict(r) for r in sales]}) or True

    if head == "vehicles" and len(parts) == 2 and method == "POST":
        try:
            vehicle_id = int(parts[1])
        except ValueError:
            return send_json({"ok": False, "error": "رقم المركبة غير صحيح"}, 400) or True
        current = db.execute("SELECT * FROM at_vehicles WHERE id=?", (vehicle_id,)).fetchone()
        if not current:
            return send_json({"ok": False, "error": "المركبة غير موجودة"}, 404) or True
        cur = dict(current)
        for field in LOCKED_VEHICLE_FIELDS:
            if field in payload and str(payload[field]) != str(cur.get(field) or ""):
                return send_json({"ok": False, "error": f"الحقل {field} ثابت وممنوع تغييره"}, 400) or True
        updates: Dict[str, Any] = {}
        for field in EDITABLE_VEHICLE_FIELDS:
            if field in payload:
                val = payload[field]
                if field == "status" and val not in VALID_STATUSES:
                    return send_json({"ok": False, "error": "حالة غير صالحة"}, 400) or True
                if field in ("list_price", "purchase_cost"):
                    val = float(val or 0)
                updates[field] = val
        if not updates:
            return send_json({"ok": False, "error": "لا توجد حقول للتحديث"}, 400) or True
        sets = ", ".join(f"{k}=?" for k in updates)
        db.execute(
            f"UPDATE at_vehicles SET {sets}, updated_at=? WHERE id=?",
            (*updates.values(), now_iso(), vehicle_id),
        )
        _audit(db, user, "vehicle_updated", "vehicle", str(vehicle_id), updates)
        db.commit()
        row = db.execute("SELECT * FROM at_vehicles WHERE id=?", (vehicle_id,)).fetchone()
        return send_json({"ok": True, "vehicle": dict(row)}) or True

    if head == "vehicles" and method == "POST" and len(parts) == 1:
        stock_no = str(payload.get("stock_no") or "").strip()
        make = str(payload.get("make") or "").strip()
        model = str(payload.get("model") or "").strip()
        if not stock_no or not make or not model:
            return send_json({"ok": False, "error": "رقم المخزون والماركة والطراز مطلوبة"}, 400) or True
        if db.execute("SELECT id FROM at_vehicles WHERE stock_no=?", (stock_no,)).fetchone():
            return send_json({"ok": False, "error": "رقم المخزون موجود مسبقاً"}, 400) or True
        status = str(payload.get("status") or "متاحة")
        if status not in VALID_STATUSES:
            status = "متاحة"
        seller_name = str(payload.get("seller_name") or "").strip()
        seller_phone = str(payload.get("seller_phone") or "").strip()
        seller_id = str(payload.get("seller_id") or "").strip()
        purchase_date = str(payload.get("purchase_date") or "").strip()
        purchase_cost = float(payload.get("purchase_cost") or 0)
        db.execute(
            """INSERT INTO at_vehicles(
                stock_no, make, model, variant, vehicle_type, color, year, vin, engine_no,
                engine_cc, seats, axles, origin_country, import_ref, purchase_cost, list_price,
                status, plate_no, license_valid_until, insurance_company, insurance_policy, notes,
                seller_name, seller_phone, seller_id, purchase_date,
                created_at, updated_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                stock_no, make, model,
                str(payload.get("variant") or ""),
                str(payload.get("vehicle_type") or ""),
                str(payload.get("color") or ""),
                int(payload.get("year") or 0) or None,
                str(payload.get("vin") or ""),
                str(payload.get("engine_no") or ""),
                str(payload.get("engine_cc") or ""),
                int(payload.get("seats") or 0) or None,
                int(payload.get("axles") or 0) or None,
                str(payload.get("origin_country") or ""),
                str(payload.get("import_ref") or ""),
                purchase_cost,
                float(payload.get("list_price") or 0),
                status,
                str(payload.get("plate_no") or ""),
                str(payload.get("license_valid_until") or ""),
                str(payload.get("insurance_company") or ""),
                str(payload.get("insurance_policy") or ""),
                str(payload.get("notes") or ""),
                seller_name, seller_phone, seller_id, purchase_date,
                now_iso(), now_iso(),
            ),
        )
        vid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        _audit(db, user, "vehicle_created", "vehicle", str(vid), {"stock_no": stock_no, "make": make, "model": model})
        if seller_name and purchase_cost > 0:
            purchase_no = _next_purchase_no(db)
            db.execute(
                """INSERT INTO at_purchases(
                    purchase_no, vehicle_id, stock_no, seller_name, seller_phone, seller_id,
                    source_country, purchase_price, paid_amount, payment_method, purchase_date,
                    notes, created_by, created_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    purchase_no, vid, stock_no, seller_name, seller_phone, seller_id,
                    str(payload.get("origin_country") or ""), purchase_cost, purchase_cost,
                    str(payload.get("purchase_payment_method") or "نقد"),
                    purchase_date or datetime.now().strftime("%Y-%m-%d"),
                    "شراء تلقائي عند إضافة المركبة", str(user.get("username") or ""), now_iso(),
                ),
            )
            _audit(db, user, "purchase_created", "purchase", purchase_no, {"stock_no": stock_no, "seller": seller_name})
        db.commit()
        row = db.execute("SELECT * FROM at_vehicles WHERE id=?", (vid,)).fetchone()
        return send_json({"ok": True, "vehicle": dict(row)}, 201) or True

    if head == "sales" and method == "GET":
        rows = db.execute(
            """SELECT s.*, v.make, v.model, v.variant, v.color, v.year
               FROM at_sales s LEFT JOIN at_vehicles v ON v.id=s.vehicle_id
               ORDER BY s.id DESC LIMIT 100"""
        ).fetchall()
        return send_json({"ok": True, "sales": [dict(r) for r in rows]}) or True

    if head == "sales" and method == "POST":
        try:
            vehicle_id = int(payload.get("vehicle_id") or 0)
        except (TypeError, ValueError):
            return send_json({"ok": False, "error": "اختر مركبة"}, 400) or True
        vehicle = db.execute("SELECT * FROM at_vehicles WHERE id=?", (vehicle_id,)).fetchone()
        if not vehicle:
            return send_json({"ok": False, "error": "المركبة غير موجودة"}, 404) or True
        v = dict(vehicle)
        if v["status"] == "مباعة":
            return send_json({"ok": False, "error": "المركبة مباعة مسبقاً"}, 400) or True
        buyer_name = str(payload.get("buyer_name") or "").strip()
        if not buyer_name:
            return send_json({"ok": False, "error": "اسم المشتري مطلوب"}, 400) or True
        sale_price = float(payload.get("sale_price") or v.get("list_price") or 0)
        deposit = float(payload.get("deposit_amount") or 0)
        sale_no = _next_sale_no(db)
        sale_date = str(payload.get("sale_date") or datetime.now().strftime("%Y-%m-%d"))
        db.execute(
            """INSERT INTO at_sales(
                sale_no, vehicle_id, stock_no, buyer_name, buyer_phone, buyer_id,
                sale_price, deposit_amount, payment_method, sale_date, status, notes,
                created_by, created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                sale_no, vehicle_id, v["stock_no"], buyer_name,
                str(payload.get("buyer_phone") or ""),
                str(payload.get("buyer_id") or ""),
                sale_price, deposit,
                str(payload.get("payment_method") or "نقد"),
                sale_date, "مكتمل",
                str(payload.get("notes") or ""),
                str(user.get("username") or ""),
                now_iso(),
            ),
        )
        db.execute(
            "UPDATE at_vehicles SET status='مباعة', buyer_name=?, buyer_phone=?, updated_at=? WHERE id=?",
            (buyer_name, str(payload.get("buyer_phone") or ""), now_iso(), vehicle_id),
        )
        sid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        _audit(db, user, "sale_created", "sale", str(sid), {"sale_no": sale_no, "stock_no": v["stock_no"], "buyer": buyer_name})
        db.commit()
        row = db.execute("SELECT * FROM at_sales WHERE id=?", (sid,)).fetchone()
        return send_json({"ok": True, "sale": dict(row)}, 201) or True

    if head == "imports" and method == "GET":
        rows = db.execute("SELECT * FROM at_import_orders ORDER BY id DESC").fetchall()
        return send_json({"ok": True, "imports": [dict(r) for r in rows]}) or True

    if head == "imports" and len(parts) == 2 and method == "POST":
        try:
            import_id = int(parts[1])
        except ValueError:
            return send_json({"ok": False, "error": "رقم الطلب غير صحيح"}, 400) or True
        current = db.execute("SELECT * FROM at_import_orders WHERE id=?", (import_id,)).fetchone()
        if not current:
            return send_json({"ok": False, "error": "الطلب غير موجود"}, 404) or True
        updates: Dict[str, Any] = {}
        for field in ("status", "eta_date", "arrival_date", "notes", "supplier", "total_cost", "vehicle_count"):
            if field in payload:
                val = payload[field]
                if field in ("total_cost",):
                    val = float(val or 0)
                if field == "vehicle_count":
                    val = int(val or 1)
                updates[field] = val
        if not updates:
            return send_json({"ok": False, "error": "لا توجد حقول للتحديث"}, 400) or True
        sets = ", ".join(f"{k}=?" for k in updates)
        db.execute(
            f"UPDATE at_import_orders SET {sets}, updated_at=? WHERE id=?",
            (*updates.values(), now_iso(), import_id),
        )
        _audit(db, user, "import_updated", "import", str(import_id), updates)
        db.commit()
        row = db.execute("SELECT * FROM at_import_orders WHERE id=?", (import_id,)).fetchone()
        return send_json({"ok": True, "import": dict(row)}) or True

    if head == "imports" and method == "POST" and len(parts) == 1:
        origin = str(payload.get("origin_country") or "").strip()
        if not origin:
            return send_json({"ok": False, "error": "بلد المنشأ مطلوب"}, 400) or True
        order_no = _next_import_no(db)
        db.execute(
            """INSERT INTO at_import_orders(
                order_no, origin_country, supplier, vehicle_count, total_cost, status,
                eta_date, arrival_date, notes, created_by, created_at, updated_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                order_no, origin,
                str(payload.get("supplier") or ""),
                int(payload.get("vehicle_count") or 1),
                float(payload.get("total_cost") or 0),
                str(payload.get("status") or "قيد الشحن"),
                str(payload.get("eta_date") or ""),
                str(payload.get("arrival_date") or ""),
                str(payload.get("notes") or ""),
                str(user.get("username") or ""),
                now_iso(), now_iso(),
            ),
        )
        iid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        _audit(db, user, "import_created", "import", str(iid), {"order_no": order_no, "origin": origin})
        db.commit()
        row = db.execute("SELECT * FROM at_import_orders WHERE id=?", (iid,)).fetchone()
        return send_json({"ok": True, "import": dict(row)}, 201) or True

    if head == "purchases" and method == "GET":
        rows = db.execute(
            """SELECT p.*, v.make, v.model, v.variant, v.color, v.year
               FROM at_purchases p LEFT JOIN at_vehicles v ON v.id=p.vehicle_id
               ORDER BY p.id DESC LIMIT 200"""
        ).fetchall()
        return send_json({"ok": True, "purchases": [dict(r) for r in rows]}) or True

    if head == "purchases" and method == "POST":
        seller_name = str(payload.get("seller_name") or "").strip()
        if not seller_name:
            return send_json({"ok": False, "error": "اسم البائع مطلوب"}, 400) or True
        purchase_price = float(payload.get("purchase_price") or 0)
        if purchase_price <= 0:
            return send_json({"ok": False, "error": "سعر الشراء مطلوب"}, 400) or True
        vehicle_id = None
        stock_no = str(payload.get("stock_no") or "").strip()
        try:
            vehicle_id = int(payload.get("vehicle_id") or 0) or None
        except (TypeError, ValueError):
            vehicle_id = None
        vehicle_row = None
        if vehicle_id:
            vehicle_row = db.execute("SELECT * FROM at_vehicles WHERE id=?", (vehicle_id,)).fetchone()
        elif stock_no:
            vehicle_row = db.execute("SELECT * FROM at_vehicles WHERE stock_no=?", (stock_no,)).fetchone()
            if vehicle_row:
                vehicle_id = vehicle_row["id"]
        if vehicle_row:
            stock_no = vehicle_row["stock_no"]
        purchase_no = _next_purchase_no(db)
        purchase_date = str(payload.get("purchase_date") or datetime.now().strftime("%Y-%m-%d"))
        db.execute(
            """INSERT INTO at_purchases(
                purchase_no, vehicle_id, stock_no, seller_name, seller_phone, seller_id,
                source_country, purchase_price, paid_amount, payment_method, purchase_date,
                notes, created_by, created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                purchase_no, vehicle_id, stock_no, seller_name,
                str(payload.get("seller_phone") or ""),
                str(payload.get("seller_id") or ""),
                str(payload.get("source_country") or ""),
                purchase_price,
                float(payload.get("paid_amount") or purchase_price),
                str(payload.get("payment_method") or "نقد"),
                purchase_date,
                str(payload.get("notes") or ""),
                str(user.get("username") or ""),
                now_iso(),
            ),
        )
        if vehicle_id:
            db.execute(
                """UPDATE at_vehicles SET purchase_cost=?, seller_name=?, seller_phone=?, seller_id=?,
                   purchase_date=?, updated_at=? WHERE id=?""",
                (
                    purchase_price, seller_name, str(payload.get("seller_phone") or ""),
                    str(payload.get("seller_id") or ""), purchase_date, now_iso(), vehicle_id,
                ),
            )
        pid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        _audit(db, user, "purchase_created", "purchase", str(pid), {"purchase_no": purchase_no, "seller": seller_name, "stock_no": stock_no})
        db.commit()
        row = db.execute("SELECT * FROM at_purchases WHERE id=?", (pid,)).fetchone()
        return send_json({"ok": True, "purchase": dict(row)}, 201) or True

    if head == "expenses" and method == "GET":
        rows = db.execute(
            """SELECT ex.*, v.make, v.model
               FROM at_expenses ex LEFT JOIN at_vehicles v ON v.id=ex.vehicle_id
               ORDER BY ex.id DESC LIMIT 200"""
        ).fetchall()
        return send_json({"ok": True, "expenses": [dict(r) for r in rows], "categories": list(EXPENSE_CATEGORIES)}) or True

    if head == "expenses" and method == "POST":
        amount = float(payload.get("amount") or 0)
        if amount <= 0:
            return send_json({"ok": False, "error": "قيمة المصروف مطلوبة"}, 400) or True
        category = str(payload.get("category") or "أخرى").strip() or "أخرى"
        vehicle_id = None
        stock_no = str(payload.get("stock_no") or "").strip()
        try:
            vehicle_id = int(payload.get("vehicle_id") or 0) or None
        except (TypeError, ValueError):
            vehicle_id = None
        if vehicle_id and not stock_no:
            v_row = db.execute("SELECT stock_no FROM at_vehicles WHERE id=?", (vehicle_id,)).fetchone()
            if v_row:
                stock_no = v_row["stock_no"]
        expense_no = _next_expense_no(db)
        expense_date = str(payload.get("expense_date") or datetime.now().strftime("%Y-%m-%d"))
        db.execute(
            """INSERT INTO at_expenses(
                expense_no, category, vehicle_id, stock_no, amount, payee, expense_date,
                payment_method, notes, created_by, created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
            (
                expense_no, category, vehicle_id, stock_no, amount,
                str(payload.get("payee") or ""),
                expense_date,
                str(payload.get("payment_method") or "نقد"),
                str(payload.get("notes") or ""),
                str(user.get("username") or ""),
                now_iso(),
            ),
        )
        eid = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        _audit(db, user, "expense_created", "expense", str(eid), {"expense_no": expense_no, "category": category, "amount": amount})
        db.commit()
        row = db.execute("SELECT * FROM at_expenses WHERE id=?", (eid,)).fetchone()
        return send_json({"ok": True, "expense": dict(row)}, 201) or True

    if head == "transactions" and method == "GET":
        limit = 300
        rows = db.execute(
            f"""
            SELECT * FROM (
                SELECT 'شراء' AS kind, p.purchase_date AS tx_date, p.purchase_no AS ref_no,
                       p.stock_no AS stock_no, p.seller_name AS party, p.purchase_price AS amount,
                       p.notes AS notes, p.created_by AS created_by, p.created_at AS created_at
                FROM at_purchases p
                UNION ALL
                SELECT 'بيع' AS kind, s.sale_date AS tx_date, s.sale_no AS ref_no,
                       s.stock_no AS stock_no, s.buyer_name AS party, s.sale_price AS amount,
                       s.notes AS notes, s.created_by AS created_by, s.created_at AS created_at
                FROM at_sales s
                UNION ALL
                SELECT 'مصروف' AS kind, ex.expense_date AS tx_date, ex.expense_no AS ref_no,
                       COALESCE(ex.stock_no, '') AS stock_no, COALESCE(ex.payee, ex.category) AS party,
                       ex.amount AS amount, ex.notes AS notes, ex.created_by AS created_by, ex.created_at AS created_at
                FROM at_expenses ex
            )
            ORDER BY tx_date DESC, created_at DESC LIMIT {limit}
            """
        ).fetchall()
        return send_json({"ok": True, "transactions": [dict(r) for r in rows]}) or True

    return send_json({"ok": False, "error": "المسار غير موجود"}, 404) or True
