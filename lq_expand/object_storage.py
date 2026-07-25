"""S3-compatible object storage for uploads (contracts, photos, proofs).

Phase 1:
- Dual-write: local disk remains source of truth for serving when present
- Remote mirror via AWS S3 / Cloudflare R2 / MinIO (S3 API)
- Fetch-from-remote when local file is missing
- SQLite continues to store /uploads/... URLs unchanged
"""
from __future__ import annotations

import os
import threading
import time
from typing import Any, Dict, Optional, Tuple

_LAST_WRITE: Optional[Dict[str, Any]] = None
_LAST_READ: Optional[Dict[str, Any]] = None
_LAST_ERROR: Optional[str] = None
_LOCK = threading.Lock()


def _env_truthy(name: str, default: str = "0") -> bool:
    return (os.environ.get(name) or default).strip().lower() in ("1", "true", "yes", "on")


def _cfg() -> Dict[str, Any]:
    enabled_flag = _env_truthy("LQ_OBJECT_STORAGE_ENABLED", "0")
    bucket = (os.environ.get("LQ_OBJECT_STORAGE_BUCKET") or os.environ.get("AWS_S3_BUCKET") or "").strip()
    access = (
        os.environ.get("LQ_OBJECT_STORAGE_ACCESS_KEY_ID")
        or os.environ.get("AWS_ACCESS_KEY_ID")
        or ""
    ).strip()
    secret = (
        os.environ.get("LQ_OBJECT_STORAGE_SECRET_ACCESS_KEY")
        or os.environ.get("AWS_SECRET_ACCESS_KEY")
        or ""
    ).strip()
    region = (
        os.environ.get("LQ_OBJECT_STORAGE_REGION")
        or os.environ.get("AWS_DEFAULT_REGION")
        or os.environ.get("AWS_REGION")
        or "auto"
    ).strip() or "auto"
    endpoint = (
        os.environ.get("LQ_OBJECT_STORAGE_ENDPOINT_URL")
        or os.environ.get("AWS_ENDPOINT_URL")
        or ""
    ).strip()
    prefix = (os.environ.get("LQ_OBJECT_STORAGE_PREFIX") or "").strip().strip("/")
    public_base = (os.environ.get("LQ_OBJECT_STORAGE_PUBLIC_BASE_URL") or "").strip().rstrip("/")
    local_fallback = _env_truthy("LQ_OBJECT_STORAGE_LOCAL_FALLBACK", "1")
    configured = bool(bucket and access and secret)
    # Opt-in only: requires LQ_OBJECT_STORAGE_ENABLED=1 plus bucket + keys
    enabled = bool(enabled_flag and configured)
    return {
        "enabled": enabled,
        "configured": configured,
        "bucket": bucket,
        "region": region,
        "endpoint_url": endpoint,
        "prefix": prefix,
        "public_base_url": public_base,
        "local_fallback": local_fallback,
        "access_configured": bool(access),
        "secret_configured": bool(secret),
    }


def boto3_available() -> bool:
    try:
        import boto3  # noqa: F401
        return True
    except Exception:
        return False


def object_storage_config() -> Dict[str, Any]:
    cfg = _cfg()
    return {
        "enabled": cfg["enabled"],
        "configured": cfg["configured"],
        "provider": "s3-compatible",
        "bucket_configured": bool(cfg["bucket"]),
        "endpoint_configured": bool(cfg["endpoint_url"]),
        "region": cfg["region"],
        "prefix": cfg["prefix"] or None,
        "public_base_configured": bool(cfg["public_base_url"]),
        "local_fallback": cfg["local_fallback"],
        "driver_installed": boto3_available(),
    }


def object_storage_status() -> Dict[str, Any]:
    cfg = object_storage_config()
    with _LOCK:
        last_write = dict(_LAST_WRITE) if _LAST_WRITE else None
        last_read = dict(_LAST_READ) if _LAST_READ else None
        last_error = _LAST_ERROR
    return {
        **cfg,
        "last_write": last_write,
        "last_read": last_read,
        "last_error": last_error,
        "ready": bool(cfg["enabled"] and cfg["driver_installed"] and cfg["configured"]),
    }


def _client():
    import boto3
    from botocore.config import Config

    cfg = _cfg()
    if not cfg["configured"]:
        raise RuntimeError("Object storage is not configured")
    kwargs: Dict[str, Any] = {
        "service_name": "s3",
        "region_name": cfg["region"] or "auto",
        "aws_access_key_id": (
            os.environ.get("LQ_OBJECT_STORAGE_ACCESS_KEY_ID")
            or os.environ.get("AWS_ACCESS_KEY_ID")
            or ""
        ).strip(),
        "aws_secret_access_key": (
            os.environ.get("LQ_OBJECT_STORAGE_SECRET_ACCESS_KEY")
            or os.environ.get("AWS_SECRET_ACCESS_KEY")
            or ""
        ).strip(),
        "config": Config(signature_version="s3v4", s3={"addressing_style": "path" if cfg["endpoint_url"] else "auto"}),
    }
    if cfg["endpoint_url"]:
        kwargs["endpoint_url"] = cfg["endpoint_url"]
    return boto3.client(**kwargs), cfg


def key_from_upload_url(url: str) -> Optional[str]:
    s = str(url or "").strip().lstrip("/")
    if not s.startswith("uploads/"):
        return None
    # normalize
    s = s.replace("\\", "/")
    while "//" in s:
        s = s.replace("//", "/")
    cfg = _cfg()
    if cfg["prefix"]:
        return f'{cfg["prefix"]}/{s}'
    return s


def probe_object_storage() -> Dict[str, Any]:
    started = time.time()
    status = object_storage_status()
    out: Dict[str, Any] = {
        "ok": False,
        "configured": status["configured"],
        "enabled": status["enabled"],
        "driver_installed": status["driver_installed"],
        "latency_ms": None,
        "error": None,
        "bucket": status.get("bucket_configured"),
    }
    if not status["configured"]:
        out["error"] = "Set LQ_OBJECT_STORAGE_BUCKET + ACCESS/SECRET keys and LQ_OBJECT_STORAGE_ENABLED=1"
        return out
    if not status["driver_installed"]:
        out["error"] = "boto3 not installed"
        return out
    if not status["enabled"]:
        out["error"] = "Object storage configured but disabled — set LQ_OBJECT_STORAGE_ENABLED=1"
        return out
    try:
        client, cfg = _client()
        # HeadBucket is the lightest connectivity check
        client.head_bucket(Bucket=cfg["bucket"])
        out["ok"] = True
        out["bucket_name"] = cfg["bucket"]
        out["endpoint_url"] = cfg["endpoint_url"] or None
    except Exception as exc:
        out["error"] = str(exc)
        _set_error(str(exc))
    out["latency_ms"] = int((time.time() - started) * 1000)
    return out


def _set_error(msg: Optional[str]) -> None:
    global _LAST_ERROR
    with _LOCK:
        _LAST_ERROR = msg


def put_bytes(key: str, data: bytes, content_type: str = "application/octet-stream") -> Dict[str, Any]:
    global _LAST_WRITE
    started = time.time()
    result: Dict[str, Any] = {"ok": False, "key": key, "bytes": len(data or b""), "skipped": False}
    status = object_storage_status()
    if not status["ready"]:
        result["skipped"] = True
        result["ok"] = True
        result["reason"] = "object storage not ready"
        return result
    try:
        client, cfg = _client()
        client.put_object(
            Bucket=cfg["bucket"],
            Key=key,
            Body=data,
            ContentType=content_type or "application/octet-stream",
        )
        result["ok"] = True
        result["bucket"] = cfg["bucket"]
        _set_error(None)
    except Exception as exc:
        result["error"] = str(exc)
        _set_error(str(exc))
    result["latency_ms"] = int((time.time() - started) * 1000)
    with _LOCK:
        _LAST_WRITE = {
            "ok": result["ok"],
            "key": key,
            "bytes": result["bytes"],
            "at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "error": result.get("error"),
        }
    return result


def get_bytes(key: str) -> Tuple[Optional[bytes], Dict[str, Any]]:
    global _LAST_READ
    started = time.time()
    meta: Dict[str, Any] = {"ok": False, "key": key}
    status = object_storage_status()
    if not status["ready"]:
        meta["skipped"] = True
        meta["reason"] = "object storage not ready"
        return None, meta
    try:
        client, cfg = _client()
        resp = client.get_object(Bucket=cfg["bucket"], Key=key)
        body = resp["Body"].read()
        meta["ok"] = True
        meta["bytes"] = len(body)
        meta["content_type"] = resp.get("ContentType")
        _set_error(None)
        with _LOCK:
            _LAST_READ = {
                "ok": True,
                "key": key,
                "bytes": len(body),
                "at": time.strftime("%Y-%m-%d %H:%M:%S"),
            }
        meta["latency_ms"] = int((time.time() - started) * 1000)
        return body, meta
    except Exception as exc:
        meta["error"] = str(exc)
        meta["latency_ms"] = int((time.time() - started) * 1000)
        _set_error(str(exc))
        with _LOCK:
            _LAST_READ = {
                "ok": False,
                "key": key,
                "at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "error": str(exc),
            }
        return None, meta


def delete_key(key: str) -> Dict[str, Any]:
    status = object_storage_status()
    result: Dict[str, Any] = {"ok": False, "key": key, "skipped": False}
    if not status["ready"]:
        result["skipped"] = True
        result["ok"] = True
        return result
    try:
        client, cfg = _client()
        client.delete_object(Bucket=cfg["bucket"], Key=key)
        result["ok"] = True
        _set_error(None)
    except Exception as exc:
        result["error"] = str(exc)
        _set_error(str(exc))
    return result


def mirror_upload_url(url: str, data: bytes, content_type: str = "application/octet-stream") -> Dict[str, Any]:
    """Best-effort remote mirror after a local write. Never raises."""
    key = key_from_upload_url(url)
    if not key:
        return {"ok": False, "error": "invalid upload url", "skipped": True}
    try:
        return put_bytes(key, data, content_type)
    except Exception as exc:
        _set_error(str(exc))
        return {"ok": False, "error": str(exc), "key": key}


def delete_upload_url(url: str) -> Dict[str, Any]:
    key = key_from_upload_url(url)
    if not key:
        return {"ok": True, "skipped": True}
    try:
        return delete_key(key)
    except Exception as exc:
        return {"ok": False, "error": str(exc), "key": key}


def fetch_upload_url(url: str) -> Tuple[Optional[bytes], Optional[str]]:
    """Return (bytes, content_type) from object storage for a /uploads/... URL."""
    key = key_from_upload_url(url)
    if not key:
        return None, None
    data, meta = get_bytes(key)
    if data is None:
        return None, None
    return data, meta.get("content_type")


def sync_local_tree(upload_dir, *, limit: int = 5000) -> Dict[str, Any]:
    """Upload local files under upload_dir that map to uploads/ keys."""
    from pathlib import Path

    root = Path(upload_dir).resolve()
    result: Dict[str, Any] = {
        "ok": False,
        "scanned": 0,
        "uploaded": 0,
        "skipped": 0,
        "errors": [],
        "ready": object_storage_status().get("ready"),
    }
    if not result["ready"]:
        result["errors"].append("object storage not ready")
        return result
    if not root.exists():
        result["errors"].append("upload dir missing")
        return result
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        result["scanned"] += 1
        if result["scanned"] > limit:
            result["errors"].append(f"limit {limit} reached")
            break
        rel = path.relative_to(root).as_posix()
        url = f"/uploads/{rel}"
        try:
            data = path.read_bytes()
            import mimetypes

            ctype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
            put = mirror_upload_url(url, data, ctype)
            if put.get("ok") and not put.get("skipped"):
                result["uploaded"] += 1
            else:
                result["skipped"] += 1
                if put.get("error"):
                    result["errors"].append(f"{rel}: {put.get('error')}")
        except Exception as exc:
            result["errors"].append(f"{rel}: {exc}")
    result["ok"] = len(result["errors"]) == 0
    return result
