#!/usr/bin/env python3
"""Smoke test: estate contract approvals-only lifecycle."""
from __future__ import annotations

import os
import sqlite3
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

TMP = tempfile.mkdtemp(prefix="estate-appr-")
os.environ["JAWDAH_DATA_DIR"] = TMP
os.environ["JAWDAH_DB_PATH"] = os.path.join(TMP, "jawdah.sqlite3")
os.environ["JAWDAH_UPLOAD_DIR"] = os.path.join(TMP, "uploads")
os.environ["JAWDAH_BACKUP_DIR"] = os.path.join(TMP, "backups")

import server  # noqa: E402


def main() -> None:
    server.init_db()
    db = server.connect()

    prop_id = "PROP-T1"
    bld_id = "BLD-T1"
    apt_id = "APT-T1"
    client_id = "CLI-T1"
    db.execute(
        "INSERT INTO estate_properties (id,name,status,location,building_count,apartment_count,room_count,base_rent_price,service_charge,attachments,last_update) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (prop_id, "P", "active", "Nizwa", 1, 1, 0, 100, 0, "[]", "2026-01-01"),
    )
    db.execute(
        "INSERT INTO estate_buildings (id,property_id,name,status,location,unit_count,apartment_count,room_count,base_rent_price,service_charge,attachments,last_update) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (bld_id, prop_id, "B1", "active", "Nizwa", 1, 1, 0, 100, 0, "[]", "2026-01-01"),
    )
    db.execute(
        """INSERT INTO estate_apartments
        (id,property_id,building_id,name,unit_kind,status,room_count,rent_price,booking_deposit,prepaid_amount,attachments,last_update)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (apt_id, prop_id, bld_id, "A1", "شقة كاملة", "vacant", 2, 250, 0, 0, "[]", "2026-01-01"),
    )
    db.execute(
        "INSERT INTO clients (id,name,phone,email,national_id,balance,notes) VALUES (?,?,?,?,?,?,?)",
        (client_id, "Tenant", "90000000", "", "", 0, ""),
    )
    db.commit()

    owner = {"id": "U1", "username": "owner", "name": "Owner", "role": "owner"}
    ops = {"id": "U2", "username": "ops", "name": "Ops", "role": "operations"}
    manager = {"id": "U3", "username": "mgr", "name": "Manager", "role": "manager"}

    contract_id = "ESC-T1"
    db.execute(
        """INSERT INTO estate_contracts
        (id,contract_no,entity_type,entity_id,property_id,building_id,apartment_id,room_id,client_id,start_date,end_date,rent_amount,payment_cycle,status,created_by,created_at,attachments,notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            contract_id,
            "EC-0001",
            "apartment",
            apt_id,
            prop_id,
            bld_id,
            apt_id,
            None,
            client_id,
            "2026-01-01",
            "2026-12-31",
            250,
            "monthly",
            "Draft",
            "Ops",
            "2026-01-01 00:00:00",
            "[]",
            "smoke",
        ),
    )
    db.commit()

    handler = object.__new__(server.JawdahHandler)

    server.create_approval_request(db, "estate_contracts", contract_id, "contract", ops["name"], "طلب")
    db.execute(
        "UPDATE estate_contracts SET status=?, rejection_reason=NULL, rejected_by=NULL, rejected_at=NULL WHERE id=?",
        ("ApprovalRequested", contract_id),
    )
    db.commit()

    handler._estate_contract_reject_core(db, manager, contract_id, "نواقص في البيانات")
    db.commit()
    st = db.execute("SELECT status, rejection_reason FROM estate_contracts WHERE id=?", (contract_id,)).fetchone()
    assert st["status"] == "Rejected", st["status"]
    assert "نواقص" in (st["rejection_reason"] or "")

    server.create_approval_request(db, "estate_contracts", contract_id, "contract", ops["name"], "إعادة")
    db.execute(
        "UPDATE estate_contracts SET status=?, rejection_reason=NULL, rejected_by=NULL, rejected_at=NULL WHERE id=?",
        ("ApprovalRequested", contract_id),
    )
    db.commit()

    handler._estate_contract_approve_core(db, owner, contract_id)
    db.commit()
    st = db.execute("SELECT status FROM estate_contracts WHERE id=?", (contract_id,)).fetchone()
    assert st["status"] == "Approved", st["status"]

    assert server.can_decide_approval(manager, "contract")
    assert server.can_decide_approval(owner, "estate_month_close")
    assert not server.can_decide_approval(ops, "contract")

    print("OK estate approvals smoke:", contract_id, "reject → re-request → approve")
    db.close()


if __name__ == "__main__":
    main()
