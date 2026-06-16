#!/usr/bin/env python3
"""Verify automatic backup paths and JSON/SQLite restore integrity (isolated temp data)."""
from __future__ import annotations

import importlib.util
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TMP = tempfile.mkdtemp(prefix="lq-backup-verify-")
os.environ["JAWDAH_DATA_DIR"] = TMP
os.environ["JAWDAH_AUTO_BACKUP"] = "1"

spec = importlib.util.spec_from_file_location("lq_server", ROOT / "server.py")
mod = importlib.util.module_from_spec(spec)
sys.modules["lq_server"] = mod
spec.loader.exec_module(mod)

mod.init_db()
with mod.connect() as db:
    mod.insert(
        db,
        "properties",
        {
            "id": "PROP-BKP-TEST",
            "name": "Backup Verify Property",
            "type": "Villa",
            "status": "Vacant",
            "price": 1500,
            "location": "Verify",
            "image": "🏠",
            "last_update": mod.today(),
            "notes": "backup verification row",
        },
    )
    db.commit()
    backup = mod.run_automatic_backup("verify-script")
    if not backup:
        print("FAIL: automatic backup could not be created")
        sys.exit(1)
    result = mod.verify_backup_restore(db)

print(f"database: {mod.DB_PATH}")
print(f"backups: {mod.BACKUP_DIR}")
print(f"score: {result.get('score')}%")
failed = [c for c in result.get("checks", []) if not c.get("ok")]
if failed:
    for check in failed:
        print(f"FAIL {check['name']}: {check.get('value')}")
    sys.exit(1)
print("OK: backup and restore verification passed")
