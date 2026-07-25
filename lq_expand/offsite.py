"""Off-site backup push: object storage (preferred) + optional webhook."""
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
    try:
        from lq_expand import object_storage as lq_object_storage

        obj = lq_object_storage.object_storage_status()
    except Exception:
        obj = {"ready": False, "configured": False}
    object_ready = bool(obj.get("ready"))
    webhook = bool(OFFSITE_BACKUP_URL)
    return {
        "enabled": bool(object_ready or webhook),
        "url_configured": webhook,
        "object_storage_ready": object_ready,
        "object_storage_configured": bool(obj.get("configured")),
        "mode": "object-storage" if object_ready else ("webhook" if webhook else "none"),
        "last_push": LAST_OFFSITE_BACKUP_AT,
        "last_status": LAST_OFFSITE_BACKUP_STATUS,
        "setup_hint": (
            None
            if object_ready or webhook
            else "Railway → Create → Bucket → Variable References (تفعّل التخزين + النسخ الخارجي معاً)"
        ),
    }


def _push_webhook(json_path: Path, sqlite_path: Path, meta: Dict[str, Any]) -> Dict[str, Any]:
    if not OFFSITE_BACKUP_URL:
        return {"ok": True, "skipped": True, "reason": "LQ_OFFSITE_BACKUP_URL not set"}
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
            return {"ok": True, "http_status": resp.status, "timestamp": meta.get("timestamp"), "channel": "webhook"}
    except urllib.error.HTTPError as exc:
        return {
            "ok": False,
            "error": f"HTTP {exc.code}",
            "detail": exc.read().decode("utf-8", errors="replace")[:300],
            "channel": "webhook",
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc), "channel": "webhook"}


def push_offsite_backup(json_path: Path, sqlite_path: Path, meta: Dict[str, Any]) -> Dict[str, Any]:
    """Push backup to object storage (preferred) and optional webhook."""
    global LAST_OFFSITE_BACKUP_AT, LAST_OFFSITE_BACKUP_STATUS
    channels: Dict[str, Any] = {}
    # 1) Durable object storage copy (Railway Bucket / S3 / R2)
    try:
        from lq_expand import object_storage as lq_object_storage

        obj_push = lq_object_storage.put_backup_files(json_path, sqlite_path, meta)
        channels["object_storage"] = obj_push
    except Exception as exc:
        channels["object_storage"] = {"ok": False, "error": str(exc)}
    # 2) Optional webhook mirror
    channels["webhook"] = _push_webhook(json_path, sqlite_path, meta)

    obj_ok = bool(channels["object_storage"].get("ok")) and not channels["object_storage"].get("skipped")
    obj_skip = bool(channels["object_storage"].get("skipped"))
    wh_ok = bool(channels["webhook"].get("ok")) and not channels["webhook"].get("skipped")
    wh_skip = bool(channels["webhook"].get("skipped"))

    if obj_ok or wh_ok:
        status = {
            "ok": True,
            "timestamp": meta.get("timestamp"),
            "channels": channels,
            "mode": "object-storage" if obj_ok else "webhook",
        }
    elif obj_skip and wh_skip:
        status = {
            "ok": True,
            "skipped": True,
            "reason": "No offsite channel configured (link Railway Bucket)",
            "channels": channels,
        }
    else:
        status = {
            "ok": False,
            "error": "offsite push failed",
            "channels": channels,
        }
    LAST_OFFSITE_BACKUP_AT = meta.get("created_at")
    LAST_OFFSITE_BACKUP_STATUS = status
    return status
