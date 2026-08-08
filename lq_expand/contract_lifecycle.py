"""Full lease contract lifecycle for Launch Quality LLC.

Flow: parties → finance → dossier → review → approval → sign → activate → close
Approved/active contracts are locked; amendments create a new edition via approval.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

ESSENTIAL_DOC_TYPES = (
    "id_copy",
    "handover",
    "furniture_keys",
    "meters",
    "condition_photos",
    "payment_schedule",
    "signatures",
)

LIFECYCLE_STEPS = (
    "parties",
    "finance",
    "dossier",
    "review",
    "approval",
    "signed",
    "active",
    "closed",
)

LOCKED_STATUSES = {"approved", "active", "activated", "signed"}


def _row_get(row: Any, key: str, default: Any = None) -> Any:
    try:
        if hasattr(row, "keys") and key in row.keys():
            return row[key]
        return getattr(row, key, default)
    except Exception:
        return default


def parse_json_field(value: Any, fallback: Any = None) -> Any:
    if fallback is None:
        fallback = {}
    if value is None or value == "":
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        data = json.loads(value)
        return data if isinstance(data, type(fallback)) or (isinstance(fallback, dict) and isinstance(data, dict)) or (isinstance(fallback, list) and isinstance(data, list)) else fallback
    except Exception:
        return fallback


def dumps_json(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False)


def add_months_safe(start: date, months: int) -> date:
    month = start.month - 1 + months
    year = start.year + month // 12
    month = month % 12 + 1
    day = min(start.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date(year, month, day)


def build_payment_schedule(
    start_date: str,
    end_date: str,
    rent_amount: float,
    payment_cycle: str = "monthly",
) -> List[Dict[str, Any]]:
    start = datetime.fromisoformat(str(start_date)).date()
    end = datetime.fromisoformat(str(end_date)).date()
    rent = round(float(rent_amount or 0), 3)
    cycle = str(payment_cycle or "monthly").strip().lower()
    step = 1
    max_rows = 120
    if cycle in ("quarterly", "quarter"):
        step = 3
    elif cycle in ("yearly", "annual"):
        step = 12
    elif cycle in ("once", "one-time", "single"):
        max_rows = 1
    rows: List[Dict[str, Any]] = []
    due = start
    n = 0
    while due <= end and n < max_rows:
        rows.append(
            {
                "seq": n + 1,
                "due_date": due.isoformat(),
                "amount": rent,
                "label": f"استحقاق إيجار #{n + 1}",
                "status": "scheduled",
            }
        )
        n += 1
        due = add_months_safe(due, step)
    return rows


def attachment_types(contract: Any) -> List[str]:
    atts = parse_json_field(_row_get(contract, "attachments"), [])
    types: List[str] = []
    for a in atts:
        if not isinstance(a, dict):
            continue
        t = str(a.get("doc_type") or a.get("type") or "").strip().lower()
        if t:
            types.append(t)
        name = str(a.get("name") or "").lower()
        if any(x in name for x in ("هوية", "جواز", "id", "passport", "national")):
            types.append("id_copy")
        if any(x in name for x in ("استلام", "handover", "محضر")):
            types.append("handover")
        if any(x in name for x in ("اثاث", "أثاث", "مفتاح", "furniture", "key")):
            types.append("furniture_keys")
        if any(x in name for x in ("عداد", "meter")):
            types.append("meters")
        if any(x in name for x in ("صور", "photo", "حالة", "condition")):
            types.append("condition_photos")
    return types


def dossier_flags(contract: Any) -> Dict[str, bool]:
    handover = parse_json_field(_row_get(contract, "handover_json"), {})
    furniture = parse_json_field(_row_get(contract, "furniture_keys_json"), {})
    meters = parse_json_field(_row_get(contract, "meter_readings_json"), {})
    photos = parse_json_field(_row_get(contract, "condition_photos_json"), [])
    schedule = parse_json_field(_row_get(contract, "payment_schedule_json"), [])
    signatures = parse_json_field(_row_get(contract, "signatures_json"), {})
    types = set(attachment_types(contract))

    has_handover = bool(handover.get("delivered_at") or handover.get("notes") or handover.get("condition") or "handover" in types)
    has_furniture = bool(
        (isinstance(furniture.get("items"), list) and furniture.get("items"))
        or furniture.get("keys_count")
        or "furniture_keys" in types
    )
    has_meters = bool(
        meters.get("electricity") is not None
        or meters.get("water") is not None
        or meters.get("readings")
        or "meters" in types
    )
    has_photos = bool((isinstance(photos, list) and len(photos) > 0) or "condition_photos" in types)
    has_schedule = bool(isinstance(schedule, list) and len(schedule) > 0)
    has_id = bool(str(_row_get(contract, "tenant_id_no") or "").strip() or "id_copy" in types)
    has_sign = bool(
        signatures.get("tenant_signed_at")
        or signatures.get("company_signed_at")
        or _row_get(contract, "signed_at")
        or "signatures" in types
    )
    return {
        "handover": has_handover,
        "furniture_keys": has_furniture,
        "meters": has_meters,
        "condition_photos": has_photos,
        "payment_schedule": has_schedule,
        "id_copy": has_id,
        "signatures": has_sign,
    }


def validate_activation_readiness(
    contract: Any,
    client: Any = None,
    property_row: Any = None,
) -> Dict[str, Any]:
    """Return {ok, missing: [...], warnings: [...]} — activation blocked if missing non-empty."""
    missing: List[str] = []
    warnings: List[str] = []

    client_name = str(_row_get(client, "name") or "").strip()
    client_phone = str(_row_get(client, "phone") or "").strip()
    client_id = str(_row_get(contract, "tenant_id_no") or _row_get(client, "national_id") or "").strip()
    if not client or not client_name:
        missing.append("بيانات العميل ناقصة (الاسم)")
    if not client_phone:
        missing.append("هاتف العميل مطلوب")
    if not client_id:
        missing.append("رقم الهوية / الجواز للمستأجر مطلوب")

    prop_name = str(_row_get(property_row, "name") or "").strip()
    unit = str(_row_get(contract, "unit_details") or "").strip()
    if not property_row or not prop_name:
        missing.append("بيانات العقار ناقصة")
    if not unit and not (
        _row_get(property_row, "apartment_no") or _row_get(property_row, "building_no")
    ):
        missing.append("تفاصيل الوحدة المؤجرة مطلوبة")

    try:
        rent = float(_row_get(contract, "rent_amount") or 0)
    except Exception:
        rent = 0
    if rent <= 0:
        missing.append("مبلغ الإيجار يجب أن يكون أكبر من صفر")

    try:
        start = datetime.fromisoformat(str(_row_get(contract, "start_date"))).date()
        end = datetime.fromisoformat(str(_row_get(contract, "end_date"))).date()
        if end < start:
            missing.append("تاريخ نهاية العقد قبل البداية")
    except Exception:
        missing.append("تواريخ العقد غير صحيحة")

    flags = dossier_flags(contract)
    labels = {
        "handover": "محضر استلام الوحدة",
        "furniture_keys": "قائمة الأثاث والمفاتيح",
        "meters": "قراءات العدادات",
        "condition_photos": "صور حالة الوحدة",
        "payment_schedule": "جدول الدفعات",
        "id_copy": "نسخة الهوية / الجواز",
        "signatures": "صفحة التوقيعات",
    }
    for key, label in labels.items():
        if not flags.get(key):
            missing.append(f"المستند الأساسي ناقص: {label}")

    status = str(_row_get(contract, "status") or "").strip().lower()
    if status not in ("approved", "signed"):
        missing.append("يجب اعتماد العقد وتوقيعه قبل التفعيل")

    if not str(_row_get(contract, "legal_terms") or "").strip():
        warnings.append("الشروط القانونية فارغة — سيُستخدم النص المحمي الافتراضي")

    return {
        "ok": len(missing) == 0,
        "missing": missing,
        "warnings": warnings,
        "dossier": flags,
        "lifecycle_step": str(_row_get(contract, "lifecycle_step") or "parties"),
        "edition_no": int(_row_get(contract, "edition_no") or 1),
    }


def validate_step(step: str, contract: Any, client: Any = None, property_row: Any = None) -> Dict[str, Any]:
    step = str(step or "parties").strip().lower()
    missing: List[str] = []
    if step == "parties":
        if not _row_get(contract, "client_id"):
            missing.append("اختر العميل")
        if not _row_get(contract, "property_id"):
            missing.append("اختر الوحدة / العقار")
        if not str(_row_get(contract, "tenant_id_no") or _row_get(client, "national_id") or "").strip():
            missing.append("رقم الهوية / الجواز")
        if client and not str(_row_get(client, "phone") or "").strip():
            missing.append("هاتف العميل")
    elif step == "finance":
        if float(_row_get(contract, "rent_amount") or 0) <= 0:
            missing.append("الأجرة الشهرية")
        try:
            start = datetime.fromisoformat(str(_row_get(contract, "start_date"))).date()
            end = datetime.fromisoformat(str(_row_get(contract, "end_date"))).date()
            if end < start:
                missing.append("المدة غير صحيحة")
        except Exception:
            missing.append("تواريخ المدة")
    elif step == "dossier":
        flags = dossier_flags(contract)
        for key, ok in flags.items():
            if key == "signatures":
                continue  # signatures come later
            if not ok:
                missing.append(key)
    elif step == "review":
        # Need parties + finance + dossier essentials except signatures
        for sub in ("parties", "finance", "dossier"):
            sub_res = validate_step(sub, contract, client, property_row)
            missing.extend(sub_res.get("missing") or [])
    return {"ok": len(missing) == 0, "missing": missing, "step": step}


def contract_snapshot(contract: Any) -> Dict[str, Any]:
    keys = [
        "id",
        "contract_no",
        "contract_type",
        "property_id",
        "client_id",
        "tenant_nationality",
        "tenant_id_no",
        "unit_details",
        "start_date",
        "end_date",
        "rent_amount",
        "deposit_amount",
        "late_fee",
        "grace_days",
        "renewal_notice_days",
        "status",
        "payment_cycle",
        "legal_terms",
        "company_signatory",
        "attachments",
        "notes",
        "edition_no",
        "parent_contract_id",
        "lifecycle_step",
        "handover_json",
        "furniture_keys_json",
        "meter_readings_json",
        "condition_photos_json",
        "payment_schedule_json",
        "signatures_json",
        "signed_at",
    ]
    out: Dict[str, Any] = {}
    for k in keys:
        out[k] = _row_get(contract, k)
    return out


def log_contract_action(
    db: Any,
    user: Optional[Dict[str, Any]],
    contract_id: str,
    action: str,
    details: str = "",
    snapshot: Optional[Dict[str, Any]] = None,
    edition_no: int = 1,
    uid_fn=None,
    now_iso_fn=None,
    insert_fn=None,
) -> str:
    """Insert into contract_actions. Callers pass uid/now/insert from server to avoid circular imports."""
    action_id = uid_fn("CA")
    row = {
        "id": action_id,
        "contract_id": contract_id,
        "edition_no": int(edition_no or 1),
        "action": action,
        "actor": (user or {}).get("username") or (user or {}).get("name") or "system",
        "details": details or "",
        "snapshot_json": dumps_json(snapshot or {}),
        "created_at": now_iso_fn(),
    }
    insert_fn(db, "contract_actions", row)
    return action_id


def clone_for_amendment(
    contract: Any,
    new_id: str,
    new_contract_no: str,
    actor: str,
) -> Dict[str, Any]:
    """Build a new Draft edition row linked to the locked parent."""
    edition = int(_row_get(contract, "edition_no") or 1) + 1
    return {
        "id": new_id,
        "contract_no": new_contract_no,
        "contract_type": _row_get(contract, "contract_type") or "Residential",
        "property_id": _row_get(contract, "property_id"),
        "client_id": _row_get(contract, "client_id"),
        "tenant_nationality": _row_get(contract, "tenant_nationality"),
        "tenant_id_no": _row_get(contract, "tenant_id_no"),
        "unit_details": _row_get(contract, "unit_details"),
        "start_date": _row_get(contract, "start_date"),
        "end_date": _row_get(contract, "end_date"),
        "rent_amount": _row_get(contract, "rent_amount"),
        "deposit_amount": _row_get(contract, "deposit_amount") or 0,
        "late_fee": _row_get(contract, "late_fee") or 0,
        "grace_days": _row_get(contract, "grace_days") or 5,
        "renewal_notice_days": _row_get(contract, "renewal_notice_days") or 30,
        "status": "Draft",
        "payment_cycle": _row_get(contract, "payment_cycle") or "monthly",
        "legal_terms": _row_get(contract, "legal_terms") or "",
        "company_signatory": _row_get(contract, "company_signatory") or "Launch Quality LLC",
        "approved_at": None,
        "approved_by": None,
        "activated_at": None,
        "activated_by": None,
        "ended_at": None,
        "attachments": _row_get(contract, "attachments") or "[]",
        "notes": f"إصدار {edition} — تعديل من {_row_get(contract, 'contract_no') or _row_get(contract, 'id')} بواسطة {actor}",
        "edition_no": edition,
        "parent_contract_id": _row_get(contract, "id"),
        "superseded_by": None,
        "lifecycle_step": "review",
        "locked": 0,
        "signed_at": None,
        "handover_json": _row_get(contract, "handover_json") or "{}",
        "furniture_keys_json": _row_get(contract, "furniture_keys_json") or "{}",
        "meter_readings_json": _row_get(contract, "meter_readings_json") or "{}",
        "condition_photos_json": _row_get(contract, "condition_photos_json") or "[]",
        "payment_schedule_json": _row_get(contract, "payment_schedule_json") or "[]",
        "signatures_json": "{}",
        "final_handover_json": "{}",
        "eviction_json": "{}",
    }


def empty_dossier_defaults() -> Dict[str, str]:
    return {
        "handover_json": dumps_json(
            {
                "delivered_at": "",
                "condition": "",
                "received_by": "",
                "delivered_by": "",
                "notes": "",
            }
        ),
        "furniture_keys_json": dumps_json({"items": [], "keys_count": 0, "access_cards": 0, "notes": ""}),
        "meter_readings_json": dumps_json(
            {"electricity": "", "water": "", "gas": "", "read_at": "", "notes": ""}
        ),
        "condition_photos_json": "[]",
        "payment_schedule_json": "[]",
        "signatures_json": dumps_json(
            {
                "tenant_name": "",
                "tenant_signed_at": "",
                "company_name": "",
                "company_signed_at": "",
                "guarantor_name": "",
                "guarantor_signed_at": "",
            }
        ),
        "final_handover_json": "{}",
        "eviction_json": "{}",
    }
