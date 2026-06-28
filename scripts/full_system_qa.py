#!/usr/bin/env python3
"""Full production QA: 10 linked samples, permissions, backup."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
import uuid

BASE = "https://web-production-08d73.up.railway.app/api"

STAFF = [
    ("owner", "owner2015", "owner"),
    ("ahmed.najjar", "Ahmed2026!", "admin"),
    ("waleed.najjar", "Waleed2026!", "owner"),
    ("ahoud.shuaili", "Ahoud2026!", "operations"),
    ("properties.manager", "Properties2026!", "operations"),
    ("operations", "Operations2026!", "viewer"),
    ("ali.hospitality", "Ali2026!", "maintenance"),
    ("maintenance", "Maintenance2026!", "viewer"),
    ("viewer", "Viewer2026!", "operations"),
    ("accountant", "Accountant2026!", "viewer"),
    ("razan.accounting", "Razan2026!", "viewer"),
    ("razan.shuaili", "Razan2026!", "accountant"),
    ("admin", "admin123", "admin"),
]

OWNER_ONLY = {"users", "production_status"}
WRITE_TESTS = [
    ("POST", "properties", {"building_no": "QA", "apartment_no": "1", "room_no": "1", "status": "شاغرة", "price": 1, "location": "QA", "notes": "perm-test", "image": "🏠", "last_update": "2026-06-28"}),
]


def req(path: str, method: str = "GET", body: dict | None = None, token: str | None = None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=90) as resp:
            raw = resp.read().decode() or "{}"
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode() or "{}"
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"ok": False, "error": raw}


def login(username: str, password: str) -> str | None:
    code, res = req("/login", "POST", {"username": username, "password": password})
    if code == 200 and res.get("token"):
        return res["token"]
    return None


def main() -> int:
    uid = uuid.uuid4().hex[:6]
    results: list[tuple[str, bool, str]] = []

    # Health + backup
    code, health = req("/health")
    ab = (health.get("auto_backup") or {})
    results.append(("health", code == 200 and health.get("ok"), f"version={health.get('version')}"))
    results.append(("auto_backup enabled", ab.get("enabled") is True, f"last={ab.get('last_backup')}"))
    results.append(("database path", bool(health.get("database")), health.get("database", "")))

    owner_token = login("owner", "owner2015")
    if not owner_token:
        print("FAIL cannot login as owner")
        return 1

    # 10 linked business examples
    chain: dict[str, str] = {}
    samples = [
        ("1 property/building", "/properties", "POST", {
            "building_no": f"BQA{uid}", "apartment_no": "2", "room_no": "A",
            "status": "شاغرة", "price": 450, "location": "Muscat QA", "notes": f"QA-{uid}",
            "image": "🏠", "last_update": "2026-06-28",
        }),
        ("2 client", "/clients", "POST", {
            "name": f"QA Client {uid}", "phone": f"96{uid[:6]}", "email": f"qa{uid}@test.local",
            "national_id": f"QA{uid}", "balance": 0, "notes": "auto QA",
        }),
        ("3 contract", "/contracts", "POST", {
            "contract_type": "Residential", "property_id": None, "client_id": None,
            "start_date": "2026-06-01", "end_date": "2026-12-31", "rent_amount": 450,
            "deposit_amount": 100, "late_fee": 10, "grace_days": 5, "renewal_notice_days": 30,
            "status": "Draft", "payment_cycle": "monthly", "legal_terms": "QA", "notes": uid,
        }),
        ("4 invoice from contract", "/invoice_from_contract", "POST", {
            "contract_id": None, "due_date": "2026-07-01", "description": f"Rent QA {uid}",
        }),
        ("5 maintenance", "/maintenance", "POST", {
            "property_id": None, "title": f"QA maint {uid}", "priority": "Medium", "status": "Open",
            "request_date": "2026-06-28", "cost": 25, "notes": "QA",
        }),
        ("6 account entry", "/accounts", "POST", {
            "entry_date": "2026-06-28", "type": "income", "category": "QA", "description": uid,
            "amount": 50, "property_id": None, "client_id": None, "invoice_id": None,
        }),
        ("7 revenue", "/revenues", "POST", {
            "revenue_date": "2026-06-28", "source": "QA", "category": "Other", "description": uid,
            "amount": 75, "client_id": None, "property_id": None,
        }),
        ("8 inventory item", "/inventory_items", "POST", {
            "sku": f"QA{uid}", "name": "QA Item", "category": "Gen", "unit": "pcs",
            "quantity": 3, "min_quantity": 1, "unit_cost": 5, "location": "Store",
        }),
        ("9 bank transaction", "/bank_transactions", "POST", {
            "bank_date": "2026-06-28", "bank_name": "QA Bank", "reference": uid,
            "type": "deposit", "description": "QA deposit", "amount": 200, "status": "Unmatched",
        }),
        ("10 admin expense", "/admin_expenses", "POST", {
            "expense_date": "2026-06-28", "category": "QA", "description": uid,
            "amount": 30, "supplier": "QA Sup", "property_id": None,
        }),
    ]

    for label, path, method, body in samples:
        payload = dict(body)
        if label.startswith("3"):
            payload["property_id"] = chain.get("property")
            payload["client_id"] = chain.get("client")
        elif label.startswith("4"):
            payload["contract_id"] = chain.get("contract")
        elif "property_id" in payload and payload["property_id"] is None and chain.get("property"):
            payload["property_id"] = chain["property"]
        if "client_id" in payload and payload["client_id"] is None and chain.get("client"):
            payload["client_id"] = chain["client"]
        code, res = req(path, method, payload, owner_token)
        ok = code == 200 and res.get("ok", True)
        item = res.get("item") or {}
        if label.startswith("1"):
            chain["property"] = item.get("id")
        elif label.startswith("2"):
            chain["client"] = item.get("id")
        elif label.startswith("3"):
            chain["contract"] = item.get("id")
        elif label.startswith("4"):
            chain["invoice"] = item.get("id")
        detail = item.get("id") or res.get("error") or ""
        results.append((label, ok, str(detail)[:80]))

    # Verify links
    if chain.get("contract") and chain.get("property") and chain.get("client"):
        code, res = req(f"/contracts/{chain['contract']}", token=owner_token)
        c = res.get("item") or {}
        linked = c.get("property_id") == chain["property"] and c.get("client_id") == chain["client"]
        results.append(("contract links property+client", linked, f"contract={chain['contract']}"))
    if chain.get("invoice"):
        code, res = req(f"/invoices/{chain['invoice']}", token=owner_token)
        inv = res.get("item") or {}
        linked = inv.get("contract_id") == chain.get("contract")
        results.append(("invoice links contract", linked, f"invoice={chain['invoice']}"))

    code, backup = req("/backup/status", token=owner_token)
    results.append(("backup status", code == 200 and backup.get("ok"), f"count={backup.get('count', backup.get('total', '?'))}"))
    code, verify = req("/backup/verify", token=owner_token)
    vr = verify.get("verification") or {}
    results.append(("backup verify", code == 200 and verify.get("ok") is not False, f"score={vr.get('score')}%"))

    # Permissions matrix
    for username, password, role in STAFF:
        token = login(username, password)
        if not token:
            results.append((f"login {username}", False, "no token"))
            continue
        results.append((f"login {username}", True, role))

        code, me = req("/me", token=token)
        results.append((f"me {username}", code == 200 and me.get("user", {}).get("role") == role, me.get("user", {}).get("role", "")))

        # owners/admin full users list
        code, users = req("/users", token=token)
        expect_users = role in ("owner", "admin")
        got_users = code == 200 and users.get("ok")
        results.append((f"users list {username}", got_users == expect_users, f"HTTP {code}"))

        # viewer should not create property
        code, w = req("/properties", "POST", {
            "building_no": "X", "apartment_no": "1", "room_no": "1", "status": "شاغرة",
            "price": 1, "location": "x", "notes": "perm", "image": "🏠", "last_update": "2026-06-28",
        }, token)
        can_write_prop = role in ("owner", "admin", "operations")
        prop_ok = (code == 200 and w.get("ok")) if can_write_prop else (code in (403, 401) or not w.get("ok"))
        results.append((f"write property {username}", prop_ok, f"HTTP {code}"))

        # only owner/admin manage users POST
        code, u = req("/users", "POST", {
            "username": f"qa{uid}x", "name": "QA", "role": "viewer", "password": "Temp2026!", "active": False,
        }, token)
        can_manage_users = role in ("owner", "admin")
        users_ok = (code == 200 and u.get("ok")) if can_manage_users else (code in (403, 401) or not u.get("ok"))
        results.append((f"manage users {username}", users_ok, f"HTTP {code}"))

    failed = [r for r in results if not r[1]]
    print("=== Launch Quality Full System QA (Production) ===\n")
    for name, ok, detail in results:
        print(f"{'OK  ' if ok else 'FAIL'} {name}  [{detail}]")
    print(f"\n{len(results) - len(failed)}/{len(results)} passed")
    if failed:
        print("\nFailed:")
        for name, _, detail in failed:
            print(f"  - {name}: {detail}")
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
