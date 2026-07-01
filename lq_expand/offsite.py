"""Off-site backup push via webhook (Phase 10)."""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional

OFFSITE_BACKUP_URL = (os.environ.get("LQ_OFFSITE_BACKUP_URL") or "").strip()
OFFSITE_BACKUP_TOKEN = (os.environ.get("LQ_OFFSITE_BACKUP_TOKEN") or "").strip()
LAST_OFFSITE_BACKUP_AT: Optional[str] = None
LAST_OFFSITE_BACKUP_STATUS: Optional[Dict[str, Any]] = None


def offsite_config() -> Dict[str, Any]:
    return {
        "enabled": bool(OFFSITE_BACKUP_URL),
        "url_configured": bool(OFFSITE_BACKUP_URL),
        "last_push": LAST_OFFSITE_BACKUP_AT,
        "last_status": LAST_OFFSITE_BACKUP_STATUS,
    }


def push_offsite_backup(json_path: Path, sqlite_path: Path, meta: Dict[str, Any]) -> Dict[str, Any]:
    global LAST_OFFSITE_BACKUP_AT, LAST_OFFSITE_BACKUP_STATUS
    if not OFFSITE_BACKUP_URL:
        status = {"ok": True, "skipped": True, "reason": "LQ_OFFSITE_BACKUP_URL not set"}
        LAST_OFFSITE_BACKUP_STATUS = status
        return status
    try:
        payload = {
            "app": "Launch Quality ERP",
            "version": meta.get("version"),
            "timestamp": meta.get("timestamp"),
            "created_at": meta.get("created_at"),
            "reason": meta.get("reason"),
            "sqlite_bytes": sqlite_path.stat().st_size if sqlite_path.exists() else 0,
            "backup": json.loads(json_path.read_text(encoding="utf-8")),
        }
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers = {"Content-Type": "application/json", "User-Agent": "LaunchQuality-OffsiteBackup/1.0"}
        if OFFSITE_BACKUP_TOKEN:
            headers["Authorization"] = f"Bearer {OFFSITE_BACKUP_TOKEN}"
        req = urllib.request.Request(OFFSITE_BACKUP_URL, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=90) as resp:
            status = {"ok": True, "http_status": resp.status, "timestamp": meta.get("timestamp")}
    except urllib.error.HTTPError as exc:
        status = {"ok": False, "error": f"HTTP {exc.code}", "detail": exc.read().decode("utf-8", errors="replace")[:300]}
    except Exception as exc:
        status = {"ok": False, "error": str(exc)}
    LAST_OFFSITE_BACKUP_AT = meta.get("created_at")
    LAST_OFFSITE_BACKUP_STATUS = status
    return status
