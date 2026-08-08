#!/usr/bin/env python3
"""Upload vehicle photos to live NAJJAR auto-trading (production or local).

Usage:
  python3 scripts/upload_vehicle_photos_production.py NT-LC-006 reference/incoming/NT-LC-006/
  python3 scripts/upload_vehicle_photos_production.py NT-LC-006 /path/to/photos --origin http://127.0.0.1:8787
"""
from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_ORIGIN = "https://web-production-08d73.up.railway.app"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}


def api(origin: str, path: str, token: str = "", method: str = "GET", body: dict | None = None) -> dict:
    url = origin.rstrip("/") + path
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code} {path}: {detail}") from exc
    return json.loads(raw) if raw else {}


def login(origin: str, username: str, password: str) -> str:
    res = api(origin, "/api/login", method="POST", body={"username": username, "password": password})
    if not res.get("ok") or not res.get("token"):
        raise SystemExit(f"Login failed: {res}")
    return str(res["token"])


def find_vehicle(origin: str, token: str, stock_no: str) -> dict:
    q = urllib.parse.quote(stock_no)
    res = api(origin, f"/api/auto-trading/vehicles?q={q}", token=token)
    vehicles = res.get("vehicles") or []
    for v in vehicles:
        if str(v.get("stock_no", "")).upper() == stock_no.upper():
            return v
    raise SystemExit(f"Vehicle not found: {stock_no}")


def data_url_for(path: Path) -> tuple[str, str]:
    mime = mimetypes.guess_type(str(path))[0] or "image/jpeg"
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}", mime


def collect_images(folder: Path) -> list[Path]:
    if not folder.is_dir():
        raise SystemExit(f"Folder not found: {folder}")
    files = sorted(
        p for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )
    if not files:
        raise SystemExit(f"No images in {folder} (expected {', '.join(sorted(IMAGE_EXTS))})")
    return files


def main() -> int:
    parser = argparse.ArgumentParser(description="Upload vehicle photos via auto-trading API")
    parser.add_argument("stock_no", help="e.g. NT-LC-006")
    parser.add_argument("folder", type=Path, help="Directory containing image files")
    parser.add_argument("--origin", default=DEFAULT_ORIGIN, help="Server base URL")
    parser.add_argument("--username", default="waleed.najjar")
    parser.add_argument("--password", default="1")
    args = parser.parse_args()

    images = collect_images(args.folder)
    token = login(args.origin, args.username, args.password)
    vehicle = find_vehicle(args.origin, token, args.stock_no)
    vehicle_id = int(vehicle["id"])
    print(f"Uploading {len(images)} photo(s) to {args.stock_no} (id={vehicle_id}) on {args.origin}")

    uploaded: list[str] = []
    for path in images:
        image, mime = data_url_for(path)
        res = api(
            args.origin,
            f"/api/auto-trading/vehicles/{vehicle_id}/photos",
            token=token,
            method="POST",
            body={"image": image, "content_type": mime, "name": path.name},
        )
        if not res.get("ok"):
            raise SystemExit(f"Upload failed for {path.name}: {res}")
        url = str(res.get("url") or "")
        uploaded.append(url)
        print(f"  OK  {path.name} -> {url}")

    verify = find_vehicle(args.origin, token, args.stock_no)
    photos = verify.get("photos") or []
    if isinstance(photos, str):
        photos = json.loads(photos)
    print(f"Done. Gallery now has {len(photos)} photo(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
