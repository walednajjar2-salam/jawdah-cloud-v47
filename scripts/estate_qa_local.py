#!/usr/bin/env python3
"""Estate platform end-to-end QA scenario (local ephemeral DB)."""
from __future__ import annotations

import json
import os
import sqlite3
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

PORT = 18776
BASE = f"http://127.0.0.1:{PORT}/api"


def request(method: str, path: str, body: dict | None = None, token: str | None = None) -> dict:
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8")
        raise RuntimeError(f"HTTP {exc.code} {path}: {text}") from exc


def request_expect_error(
    method: str,
    path: str,
    *,
    code: int,
    body: dict | None = None,
    token: str | None = None,
) -> tuple[bool, str]:
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20):
            pass
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8")
        if exc.code == code:
            return True, text
        return False, f"expected {code}, got {exc.code}: {text}"
    return False, "request succeeded unexpectedly"


def seed_full_access_user(db_path: Path, password_hash_fn) -> None:
    with sqlite3.connect(db_path) as db:
        db.execute(
            """
            INSERT OR REPLACE INTO users
            (id,username,name,role,active,email,must_change_password,password_hash,password_changed_at,created_at,last_login)
            VALUES(?,?,?,?,?,?,?,?,datetime('now'),datetime('now'),NULL)
            """,
            (
                "USR-WALEED",
                "waleed",
                "وليد نجار",
                "owner",
                1,
                "waleed@example.com",
                0,
                password_hash_fn("qa-estate-pass-123A!"),
            ),
        )
        db.commit()


def main() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="lq_estate_qa_"))
    os.environ["JAWDAH_DATA_DIR"] = str(tmp)
    os.environ["JAWDAH_HOST"] = "127.0.0.1"
    os.environ["JAWDAH_PORT"] = str(PORT)
    os.environ["JAWDAH_AUTO_BACKUP"] = "0"
    os.environ["ADMIN_PASSWORD"] = "qa-admin-pass-123A!"

    import server  # noqa: WPS433

    server.ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
    server.init_db()
    seed_full_access_user(server.DB_PATH, server.password_hash)

    httpd = server.ThreadingHTTPServer(("127.0.0.1", PORT), server.JawdahHandler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.8)

    failures: list[str] = []

    def check(name: str, ok: bool, detail: str = "") -> None:
        status = "PASS ✅" if ok else "FAIL ❌"
        print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))
        if not ok:
            failures.append(name)

    try:
        login = request("POST", "/login", {"username": "waleed", "password": "qa-estate-pass-123A!"})
        token = login.get("token") or ""
        check("تسجيل الدخول لحساب صلاحية كاملة", bool(token), f"user={login.get('user', {}).get('username')}")
        if not token:
            raise RuntimeError("Unable to login QA user")

        today_s = date.today().isoformat()
        end_s = (date.today() + timedelta(days=30)).isoformat()
        contract_end = (date.today() + timedelta(days=365)).isoformat()
        month_key = today_s[:7]

        c1 = request("POST", "/clients", {"name": "عميل QA", "phone": "90000001", "email": "qa@client.test"}, token=token)
        client_id = c1["item"]["id"]
        check("إنشاء عميل", bool(client_id), client_id)

        p1 = request(
            "POST",
            "/estate_properties",
            {"name": "QA Property", "status": "active", "location": "Nizwa", "building_count": 1, "apartment_count": 1, "room_count": 2},
            token=token,
        )
        prop_id = p1["item"]["id"]
        check("إنشاء عقار", bool(prop_id), prop_id)

        b1 = request(
            "POST",
            "/estate_buildings",
            {"property_id": prop_id, "name": "B-1", "status": "active", "apartment_count": 1, "room_count": 2},
            token=token,
        )
        bld_id = b1["item"]["id"]
        check("إنشاء بناية مرتبطة", bool(bld_id), bld_id)
        prop_rows = request("GET", "/estate_properties", token=token).get("items", [])
        bld_rows = request("GET", "/estate_buildings", token=token).get("items", [])
        prop_exists = any(x.get("id") == prop_id for x in prop_rows)
        bld_exists = any(x.get("id") == bld_id for x in bld_rows)
        check("تأكيد حفظ العقار بعد الإنشاء", prop_exists, f"rows={len(prop_rows)}")
        check("تأكيد حفظ البناية بعد الإنشاء", bld_exists, f"rows={len(bld_rows)}")

        apt_id = ""
        reserved_created = False
        try:
            a1 = request(
                "POST",
                "/estate_apartments",
                {
                    "property_id": prop_id,
                    "building_id": bld_id,
                    "name": "A-101",
                    "status": "reserved",
                    "room_count": 2,
                    "rent_price": 250,
                    "booking_deposit": 50,
                    "prepaid_amount": 20,
                    "reservation_start_date": today_s,
                    "reservation_end_date": end_s,
                    "booked_client_name": "عميل QA",
                    "booked_client_phone": "90000001",
                    "booked_client_id": client_id,
                    "booked_by_employee": "موظف QA",
                },
                token=token,
            )
            apt_id = a1["item"]["id"]
            reserved_created = True
            check("إنشاء شقة بحالة محجوزة", bool(apt_id), apt_id)
        except Exception as exc:
            check("إنشاء شقة بحالة محجوزة", False, str(exc))
            apt_id = "APT-QA-FALLBACK"
            with sqlite3.connect(server.DB_PATH) as db:
                db.execute(
                    """
                    INSERT INTO estate_apartments
                    (id,property_id,building_id,name,status,room_count,rent_price,tenant_client_id,tenant_phone,last_update)
                    VALUES(?,?,?,?,?,?,?,?,?,date('now'))
                    """,
                    (apt_id, prop_id, bld_id, "A-101", "occupied", 2, 250, client_id, "90000001"),
                )
                db.commit()
            check("إنشاء شقة بديلة لاستكمال السيناريو", True, apt_id)

        if reserved_created:
            inv_list = request("GET", "/estate_reservation_invoices", token=token).get("items", [])
            open_res = [x for x in inv_list if x.get("entity_id") == apt_id and str(x.get("status", "")).lower() == "open"]
            check("إنشاء فاتورة حجز تلقائية", len(open_res) >= 1, f"open={len(open_res)}")

            conv = request(
                "POST",
                "/estate_convert_reservation",
                {"entity_type": "apartment", "entity_id": apt_id, "tenant_client_id": client_id, "note": "QA convert"},
                token=token,
            )
            check("تحويل محجوز → مؤجرة", conv.get("status") == "occupied", f"status={conv.get('status')}")
        else:
            check("إنشاء فاتورة حجز تلقائية", False, "تخطيت بسبب فشل إنشاء شقة reserved عبر API")
            check("تحويل محجوز → مؤجرة", False, "تخطيت بسبب فشل إنشاء شقة reserved عبر API")

        contract = request(
            "POST",
            "/estate_convert_to_contract",
            {
                "entity_type": "apartment",
                "entity_id": apt_id,
                "tenant_client_id": client_id,
                "start_date": today_s,
                "end_date": contract_end,
                "rent_amount": 250,
                "payment_cycle": "monthly",
            },
            token=token,
        )
        contract_id = contract.get("contract", {}).get("id")
        created_schedule = int(contract.get("schedule", {}).get("created") or 0)
        check("إنشاء عقد نشط من الوحدة", bool(contract_id), contract.get("contract", {}).get("contract_no", ""))
        check("توليد جدول دفعات أولي", created_schedule >= 1, f"created={created_schedule}")

        invoices = request("GET", "/estate_contract_invoices", token=token).get("items", [])
        first_inv = next((x for x in invoices if x.get("contract_id") == contract_id), None)
        check("وجود فواتير عقد", bool(first_inv), f"count={len([x for x in invoices if x.get('contract_id') == contract_id])}")

        if first_inv:
            pay = request(
                "POST",
                "/estate_contract_pay_invoice",
                {"invoice_id": first_inv["id"], "amount": 10, "payment_date": today_s},
                token=token,
            )
            check("تسجيل دفعة على فاتورة العقد", str(pay.get("status", "")).lower() in ("partial", "paid"), pay.get("status", ""))
        else:
            check("تسجيل دفعة على فاتورة العقد", False, "missing invoice")

        ops = request("GET", "/estate_operations_check", token=token)
        check("فحص سلامة التشغيل العقاري", int(ops.get("score") or 0) >= 80, f"score={ops.get('score')}")

        expected_fail, detail = request_expect_error(
            "POST",
            "/estate_month_close",
            code=400,
            body={"month_key": month_key, "force": False, "note": "QA expected validation"},
            token=token,
        )
        check("منع إقفال شهر مع ذمم مفتوحة بدون force", expected_fail, detail[:120])

    except Exception as exc:  # broad for CLI visibility
        check("تشغيل السيناريو بالكامل", False, str(exc))
    finally:
        httpd.shutdown()

    print("\nEstate QA Scenario:", "SUCCESS" if not failures else f"FAILED ({len(failures)})")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
