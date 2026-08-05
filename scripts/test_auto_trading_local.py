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
    assert company["name_en"] == "NAJJAR TRADING"
    assert company["bank"]["iban"].startswith("OM07")

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

    print("auto-trading API smoke test: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
