#!/usr/bin/env python3
"""Smoke test for NAJJAR TRADING /api/auto-trading endpoints."""
from __future__ import annotations

import json
import sqlite3
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import lq_auto_trading  # noqa: E402


def main() -> int:
    db_path = Path(tempfile.mkdtemp()) / "at_test.db"
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    lq_auto_trading.ensure_tables(db)
    user = {"username": "owner", "name": "Test", "role": "owner"}
    out: list[tuple] = []

    def send(data, status=200):
        out.append((status, data))
        return True

    assert lq_auto_trading.handle_api(db, "GET", ["company"], {}, {}, user, send)
    company = out[-1][1]["company"]
    assert company["name_en"] == "NAJJAR & AL SAMOOM TRADING"
    assert company["bank"]["iban"].startswith("OM07")
    assert any(s.get("name_ar") == "وليد نجار" for s in company.get("staff") or [])
    assert any(s.get("name_ar") == "حمد السموم" for s in company.get("staff") or [])
    assert any(s.get("name_ar") == "واية الشعيلي" for s in company.get("staff") or [])
    assert any(s.get("name_ar") == "رزان الشعيلي" for s in company.get("staff") or [])
    assert len(company.get("platforms") or []) >= 8

    assert lq_auto_trading.handle_api(db, "GET", ["dashboard"], {}, {}, user, send)
    stats = out[-1][1]["stats"]
    assert stats["total_vehicles"] >= 4

    assert lq_auto_trading.handle_api(db, "GET", ["vehicles"], {}, {}, user, send)
    vehicles = out[-1][1]["vehicles"]
    assert [v["stock_no"] for v in vehicles[:4]] == [
        "NT-LR-001", "NT-MB-002", "NT-MB-003", "NT-BMW-004"
    ]
    assert vehicles[0]["vin"] == "SALEA7BW5S2123456"
    assert vehicles[1]["vin"] == "4JGFD6BB1TB591167"
    assert vehicles[1]["status"] == "قيد الاستيراد"
    assert vehicles[2]["variant"] == "G63 AMG"
    assert vehicles[2]["license_doc_no"] == "72863679"
    assert vehicles[3]["vin"] == "WBAFR9C55DD226932"
    assert vehicles[3]["plate_no"] == "61265 / د د"

    assert lq_auto_trading.handle_api(
        db, "POST", ["imports"], {}, {"origin_country": "UAE", "vehicle_count": 2}, user, send
    )
    import_id = out[-1][1]["import"]["id"]

    assert lq_auto_trading.handle_api(
        db, "POST", ["imports", str(import_id)], {}, {"status": "مستلم"}, user, send
    )
    assert out[-1][1]["import"]["status"] == "مستلم"

    vehicle_id = db.execute("SELECT id FROM at_vehicles WHERE status='متاحة' LIMIT 1").fetchone()[0]
    assert lq_auto_trading.handle_api(
        db,
        "POST",
        ["sales"],
        {},
        {"vehicle_id": vehicle_id, "buyer_name": "Test Buyer", "sale_price": 1000},
        user,
        send,
    )
    assert out[-1][0] == 201

    # Purchases (seller info) ledger
    assert lq_auto_trading.handle_api(
        db,
        "POST",
        ["purchases"],
        {},
        {
            "vehicle_id": vehicle_id,
            "seller_name": "أحمد الكندي",
            "seller_phone": "99112233",
            "seller_id": "12345678",
            "source_country": "سلطنة عُمان",
            "purchase_price": 8500,
            "purchase_date": "2026-01-05",
        },
        user,
        send,
    )
    assert out[-1][0] == 201
    purchase = out[-1][1]["purchase"]
    assert purchase["seller_name"] == "أحمد الكندي"
    assert purchase["purchase_price"] == 8500

    updated_vehicle = db.execute("SELECT seller_name, purchase_cost FROM at_vehicles WHERE id=?", (vehicle_id,)).fetchone()
    assert updated_vehicle["seller_name"] == "أحمد الكندي"
    assert updated_vehicle["purchase_cost"] == 8500

    assert lq_auto_trading.handle_api(db, "GET", ["purchases"], {}, {}, user, send)
    assert len(out[-1][1]["purchases"]) >= 1

    # Expenses
    assert lq_auto_trading.handle_api(
        db,
        "POST",
        ["expenses"],
        {},
        {"category": "شحن واستيراد", "amount": 250, "payee": "شركة الشحن", "expense_date": "2026-01-06"},
        user,
        send,
    )
    assert out[-1][0] == 201
    assert out[-1][1]["expense"]["category"] == "شحن واستيراد"

    assert lq_auto_trading.handle_api(db, "GET", ["expenses"], {}, {}, user, send)
    assert len(out[-1][1]["expenses"]) >= 1
    assert len(out[-1][1]["categories"]) >= 5

    # Daily transactions ledger (purchases + sales + expenses)
    assert lq_auto_trading.handle_api(db, "GET", ["transactions"], {}, {}, user, send)
    tx = out[-1][1]["transactions"]
    kinds = {t["kind"] for t in tx}
    assert {"شراء", "بيع", "مصروف"}.issubset(kinds)

    # Partner capital — وليد النجار / حمد السموم
    assert lq_auto_trading.handle_api(db, "GET", ["capital"], {}, {}, user, send)
    capital = out[-1][1]
    partners = capital["summary"]["partners"]
    assert len(partners) == 2
    assert {p["name_ar"] for p in partners} == {"وليد النجار", "حمد السموم"}
    waleed_id = next(p["id"] for p in partners if p["code"] == "waleed")
    hamad_id = next(p["id"] for p in partners if p["code"] == "hamad")

    assert lq_auto_trading.handle_api(
        db, "POST", ["capital"], {},
        {"partner_id": waleed_id, "entry_type": "opening", "amount": 10000, "entry_date": "2026-01-01"},
        user, send,
    )
    assert out[-1][0] == 201
    assert lq_auto_trading.handle_api(
        db, "POST", ["capital"], {},
        {"partner_id": hamad_id, "entry_type": "opening", "amount": 10000, "entry_date": "2026-01-01"},
        user, send,
    )
    assert out[-1][0] == 201

    assert lq_auto_trading.handle_api(
        db, "POST", ["distributions"], {},
        {"total_amount": 2000, "period_label": "اختبار Q1", "status": "معتمد", "dist_date": "2026-03-31"},
        user, send,
    )
    assert out[-1][0] == 201
    splits = out[-1][1]["splits"]
    assert len(splits) == 2
    assert abs(sum(float(s["amount"]) for s in splits) - 2000) < 0.01
    assert all(abs(float(s["amount"]) - 1000) < 0.01 for s in splits)

    assert lq_auto_trading.handle_api(db, "GET", ["capital"], {}, {}, user, send)
    summary = out[-1][1]["summary"]
    assert summary["total_capital"] >= 20000
    assert summary["total_distributed"] >= 2000
    for p in summary["partners"]:
        assert abs(float(p["distributions_total"]) - 1000) < 0.01

    # Dashboard now reflects purchases/expenses/net profit + capital
    assert lq_auto_trading.handle_api(db, "GET", ["dashboard"], {}, {}, user, send)
    stats2 = out[-1][1]["stats"]
    assert stats2["purchases_total"] >= 8500
    assert stats2["expenses_total"] >= 250
    assert "net_profit" in stats2
    assert stats2["total_capital"] >= 20000

    print("auto-trading API smoke test: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
