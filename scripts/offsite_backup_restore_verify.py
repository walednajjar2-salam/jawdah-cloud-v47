#!/usr/bin/env python3
"""Mirror latest backup to offsite path and verify restore."""
from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
from pathlib import Path


def latest_backup_unit(root: Path) -> tuple[Path, Path, str]:
    dirs = [p for p in root.iterdir() if p.is_dir()]
    if dirs:
        latest = sorted(dirs)[-1]
        db = latest / "jawdah.sqlite3"
        if not db.exists():
            raise RuntimeError(f"Latest backup directory missing jawdah.sqlite3: {latest}")
        return latest, db, latest.name
    sqlite_files = sorted(root.glob("*.sqlite3"))
    if sqlite_files:
        latest_sqlite = sqlite_files[-1]
        stem = latest_sqlite.stem
        json_file = root / f"{stem}.json"
        unit_name = stem
        return latest_sqlite, latest_sqlite, unit_name
    raise RuntimeError(f"No backup units found under {root}")


def sqlite_integrity(path: Path) -> str:
    con = sqlite3.connect(path)
    try:
        return str(con.execute("PRAGMA integrity_check").fetchone()[0])
    finally:
        con.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Offsite backup mirror + restore verification")
    parser.add_argument("--local-backup-root", default="/workspace/data/backups")
    parser.add_argument("--offsite-root", default="/workspace/backups/offsite-mirror")
    parser.add_argument("--verify-root", default="/workspace/backups/offsite-restore-test")
    args = parser.parse_args()

    local_root = Path(args.local_backup_root).resolve()
    offsite_root = Path(args.offsite_root).resolve()
    verify_root = Path(args.verify_root).resolve()
    offsite_root.mkdir(parents=True, exist_ok=True)
    verify_root.mkdir(parents=True, exist_ok=True)

    latest_unit, latest_db, unit_name = latest_backup_unit(local_root)
    target = offsite_root / unit_name
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True, exist_ok=True)
    if latest_unit.is_dir():
        shutil.copytree(latest_unit, target, dirs_exist_ok=True)
    else:
        shutil.copy2(latest_unit, target / latest_unit.name)
        json_pair = latest_unit.with_suffix(".json")
        if json_pair.exists():
            shutil.copy2(json_pair, target / json_pair.name)

    verify_target = verify_root / f"restore-{unit_name}"
    if verify_target.exists():
        shutil.rmtree(verify_target)
    shutil.copytree(target, verify_target)

    db_candidates = list(verify_target.glob("*.sqlite3"))
    db_path = (verify_target / "jawdah.sqlite3") if (verify_target / "jawdah.sqlite3").exists() else (db_candidates[0] if db_candidates else verify_target / "jawdah.sqlite3")
    if not db_path.exists():
        raise RuntimeError("Restored archive missing jawdah.sqlite3")
    integrity = sqlite_integrity(db_path)
    if integrity.lower() != "ok":
        raise RuntimeError(f"Integrity check failed: {integrity}")

    result = {
        "ok": True,
        "source_backup": str(latest_unit),
        "source_database": str(latest_db),
        "offsite_backup": str(target),
        "restore_test_path": str(verify_target),
        "integrity_check": integrity,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

