"""Estate platform foundation: client lifecycle, autofill, integrity checks, receipts.

Mandatory order: save → autofill → data linking → section linking → approvals → permissions → tests.
Do not treat the platform as publish-ready until integrity_report() is clean.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

CLIENT_STATUS_PROSPECT = "prospect"
CLIENT_STATUS_CURRENT = "current_tenant"
CLIENT_STATUS_FORMER = "former_tenant"
CLIENT_STATUS_LABELS = {
    CLIENT_STATUS_PROSPECT: "عميل محتمل",
    CLIENT_STATUS_CURRENT: "مستأجر حالي",
    CLIENT_STATUS_FORMER: "مستأجر سابق",
}


def _get(row: Any, key: str, default: Any = None) -> Any:
    try:
        if hasattr(row, "keys") and key in row.keys():
            return row[key]
        return getattr(row, key, default)
    except Exception:
        return default


def parse_json(value: Any, fallback: Any = None) -> Any:
    if fallback is None:
        fallback = {}
    if value is None or value == "":
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        data = json.loads(value)
        return data
    except Exception:
        return fallback


def client_autofill(client: Any) -> Dict[str, Any]:
    if not client:
        return {}
    return {
        "client_id": _get(client, "id"),
        "client_no": _get(client, "id"),
        "name": _get(client, "name") or "",
        "phone": _get(client, "phone") or "",
        "phone_alt": _get(client, "phone_alt") or "",
        "national_id": _get(client, "national_id") or "",
        "nationality": _get(client, "nationality") or "",
        "email": _get(client, "email") or "",
        "address": _get(client, "address") or "",
        "lifecycle_status": _get(client, "lifecycle_status") or CLIENT_STATUS_PROSPECT,
        "lifecycle_label": CLIENT_STATUS_LABELS.get(
            str(_get(client, "lifecycle_status") or CLIENT_STATUS_PROSPECT), "عميل"
        ),
        "id_card_image": _get(client, "id_card_image") or "",
        "notes": _get(client, "notes") or "",
    }


def unit_autofill(unit: Any, building: Any = None, property_row: Any = None) -> Dict[str, Any]:
    if not unit:
        return {}
    return {
        "entity_id": _get(unit, "id"),
        "name": _get(unit, "name") or "",
        "property_id": _get(unit, "property_id") or _get(property_row, "id"),
        "building_id": _get(unit, "building_id") or _get(building, "id"),
        "building_no": _get(building, "name") or "",
        "unit_no": _get(unit, "name") or "",
        "unit_kind": _get(unit, "unit_kind") or "",
        "room_count": _get(unit, "room_count") or _get(unit, "room_type") or "",
        "floor_no": _get(unit, "floor_no") or "",
        "area_sqm": _get(unit, "area_sqm") or "",
        "rent_price": float(_get(unit, "rent_price") or 0),
        "status": _get(unit, "status") or "",
        "services": _get(unit, "notes") or "",
        "booking_deposit": float(_get(unit, "booking_deposit") or 0),
        "prepaid_amount": float(_get(unit, "prepaid_amount") or 0),
        "booked_client_id": _get(unit, "booked_client_id") or "",
        "tenant_client_id": _get(unit, "tenant_client_id") or "",
        "reservation_start_date": _get(unit, "reservation_start_date") or "",
        "reservation_end_date": _get(unit, "reservation_end_date") or "",
        "property_name": _get(property_row, "name") or "",
        "location": _get(building, "location") or _get(property_row, "location") or "",
    }


def contract_autofill(client: Any, unit: Any, building: Any = None, property_row: Any = None, extras: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    base = {
        "company": {
            "name_ar": "مشاريع جودة الانطلاقة للخدمات",
            "name_en": "QUALITY OF LAUNCH PROJECTS LLC",
            "cr": "1466316",
        },
        "client": client_autofill(client),
        "unit": unit_autofill(unit, building, property_row),
    }
    if extras:
        base.update(extras)
    return base


def payment_autofill(invoice: Any, contract: Any = None, client: Any = None, paid_before: float = 0.0) -> Dict[str, Any]:
    amount = float(_get(invoice, "amount") or 0)
    paid = float(_get(invoice, "paid_amount") or paid_before or 0)
    remaining = max(0.0, round(amount - paid, 3))
    return {
        "invoice_id": _get(invoice, "id"),
        "invoice_no": _get(invoice, "invoice_no"),
        "contract_id": _get(invoice, "contract_id") or _get(contract, "id"),
        "client_id": _get(contract, "client_id") or _get(client, "id"),
        "client_name": _get(client, "name") or "",
        "due_date": _get(invoice, "due_date") or "",
        "amount_due": amount,
        "amount_paid": paid,
        "amount_remaining": remaining,
        "status": _get(invoice, "status") or "",
    }


def maintenance_autofill(unit: Any, client: Any = None, building: Any = None) -> Dict[str, Any]:
    apartment_id = _get(unit, "apartment_id") or ""
    # Apartment rows themselves use their own id; rooms point to apartment_id.
    if not apartment_id and (_get(unit, "room_count") is not None or _get(unit, "unit_kind")):
        apartment_id = _get(unit, "id") or ""
    return {
        "property_id": _get(unit, "property_id"),
        "building_id": _get(unit, "building_id") or _get(building, "id"),
        "apartment_id": apartment_id,
        "unit_name": _get(unit, "name") or "",
        "unit_status": _get(unit, "status") or "",
        "tenant_client_id": _get(unit, "tenant_client_id") or _get(client, "id") or "",
        "tenant_name": _get(client, "name") or "",
        "tenant_phone": _get(client, "phone") or _get(unit, "tenant_phone") or "",
        "last_maintenance_notes": _get(unit, "maintenance_notes") or "",
    }


def sync_client_lifecycle_status(db: Any, client_id: str) -> str:
    """Derive client status from active estate + legacy contracts. Returns new status."""
    if not client_id:
        return CLIENT_STATUS_PROSPECT
    active_estate = db.execute(
        """
        SELECT COUNT(*) AS c FROM estate_contracts
        WHERE client_id=? AND lower(status) IN ('active','approved','signed')
        """,
        (client_id,),
    ).fetchone()
    active_legacy = db.execute(
        """
        SELECT COUNT(*) AS c FROM contracts
        WHERE client_id=? AND lower(status) IN ('active','activated','approved','signed')
        """,
        (client_id,),
    ).fetchone()
    any_active = int((active_estate["c"] if active_estate else 0) or 0) + int((active_legacy["c"] if active_legacy else 0) or 0)
    if any_active > 0:
        status = CLIENT_STATUS_CURRENT
    else:
        past_estate = db.execute(
            "SELECT COUNT(*) AS c FROM estate_contracts WHERE client_id=? AND lower(status) IN ('ended','cancelled','renewed','expired')",
            (client_id,),
        ).fetchone()
        past_legacy = db.execute(
            "SELECT COUNT(*) AS c FROM contracts WHERE client_id=? AND lower(status) IN ('ended','cancelled','renewed','expired','expired')",
            (client_id,),
        ).fetchone()
        past = int((past_estate["c"] if past_estate else 0) or 0) + int((past_legacy["c"] if past_legacy else 0) or 0)
        status = CLIENT_STATUS_FORMER if past > 0 else CLIENT_STATUS_PROSPECT
    try:
        db.execute("UPDATE clients SET lifecycle_status=? WHERE id=?", (status, client_id))
    except Exception:
        pass
    return status


def integrity_report(db: Any) -> Dict[str, Any]:
    """Data integrity checks before staging/publish."""
    issues: List[Dict[str, str]] = []

    # Duplicate phones
    for row in db.execute(
        """
        SELECT phone, COUNT(*) AS c FROM clients
        WHERE phone IS NOT NULL AND trim(phone) != ''
        GROUP BY phone HAVING c > 1
        """
    ).fetchall():
        issues.append({"code": "duplicate_client_phone", "detail": f"phone={row['phone']} count={row['c']}"})

    # Two active estate contracts same unit
    for row in db.execute(
        """
        SELECT entity_type, entity_id, COUNT(*) AS c FROM estate_contracts
        WHERE lower(status) IN ('active','approved')
        GROUP BY entity_type, entity_id HAVING c > 1
        """
    ).fetchall():
        issues.append(
            {
                "code": "duplicate_active_estate_contract",
                "detail": f"{row['entity_type']}:{row['entity_id']} count={row['c']}",
            }
        )

    # Occupied unit without active contract
    for table, et in (("estate_apartments", "apartment"), ("estate_rooms", "room")):
        for unit in db.execute(
            f"SELECT id, name, status FROM {table} WHERE lower(status) IN ('occupied','rented')"
        ).fetchall():
            active = db.execute(
                """
                SELECT id FROM estate_contracts
                WHERE entity_type=? AND entity_id=? AND lower(status)='active'
                LIMIT 1
                """,
                (et, unit["id"]),
            ).fetchone()
            if not active:
                issues.append(
                    {
                        "code": "occupied_without_active_contract",
                        "detail": f"{et}:{unit['id']} ({unit['name']})",
                    }
                )

    # Reserved without client id
    for table, et in (("estate_apartments", "apartment"), ("estate_rooms", "room")):
        for unit in db.execute(
            f"SELECT id, name FROM {table} WHERE lower(status)='reserved' AND (booked_client_id IS NULL OR trim(booked_client_id)='')"
        ).fetchall():
            issues.append({"code": "reserved_without_client_id", "detail": f"{et}:{unit['id']} ({unit['name']})"})

    # Active contract on maintenance unit
    for row in db.execute(
        """
        SELECT c.id, c.contract_no, c.entity_type, c.entity_id
        FROM estate_contracts c
        WHERE lower(c.status)='active'
        """
    ).fetchall():
        table = "estate_apartments" if row["entity_type"] == "apartment" else "estate_rooms"
        unit = db.execute(f"SELECT status FROM {table} WHERE id=?", (row["entity_id"],)).fetchone()
        if unit and str(unit["status"] or "").lower() == "maintenance":
            issues.append(
                {
                    "code": "active_contract_on_maintenance_unit",
                    "detail": f"{row['contract_no'] or row['id']}",
                }
            )

    summary = {
        "ok": len(issues) == 0,
        "issue_count": len(issues),
        "issues": issues[:200],
        "checked_at": datetime.utcnow().isoformat() + "Z",
        "publish_ready": len(issues) == 0,
        "note_ar": "لا يُسمح بالنشر قبل تصفير مشاكل السلامة.",
    }
    return summary


PHASE1_AUDIT = {
    "version": "2026.8.2-foundation",
    "stacks": ["legacy properties/contracts/invoices", "estate_*", "quick-estate qe_*"],
    "working": [
        "clients CRUD",
        "legacy contracts approve/activate",
        "invoices/payments (legacy)",
        "estate units drawer",
        "estate contract lifecycle APIs",
        "approvals center",
        "alerts",
        "backup/wipe",
    ],
    "incomplete": [
        "estate property/building create UI (partial — Nizwa UX create unit)",
        "employee photo avatars",
        "dashboard ignoring full estate ledger KPIs",
        "human staging sign-off by owner",
        "Windows size matrix manual verification",
    ],
    "fixed_in_foundation": [
        "reservation requires booked_client_id",
        "reservation converts to contract draft only",
        "estate pay creates payment_receipts",
        "client dossier needs/viewings/followups",
        "maintenance blocks_rental syncs unit status",
        "closed-file amendment via approvals",
        "estate_qa_lifecycle scenario + backup dry-run UI",
    ],
    "mandatory_order": [
        "save",
        "autofill",
        "data_linking",
        "section_linking",
        "approvals",
        "permissions",
        "tests",
        "backup",
        "staging",
        "publish",
    ],
    "publish_blocked": True,
}
