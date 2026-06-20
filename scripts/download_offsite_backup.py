#!/usr/bin/env python3
"""Download latest automatic backups from production to a local offsite folder."""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import time
import urllib.error
import urllib.request

DEFAULT_BASE = "https://web-production-08d73.up.railway.app"


def request_json(method: str, url: str, body: dict | None = None, token: str | None = None) -> dict:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def download_file(url: str, token: str, dest: pathlib.Path) -> None:
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=300) as resp, dest.open("wb") as out:
        out.write(resp.read())


def default_dest() -> pathlib.Path:
    home = pathlib.Path.home()
    for name in ("OneDrive", "OneDrive - Personal"):
        root = home / name / "Launch-Quality-Backups"
        if (home / name).exists():
            return root
    return home / "Launch-Quality-Backups"


def main() -> int:
    parser = argparse.ArgumentParser(description="Download offsite Launch Quality backups")
    parser.add_argument("--base", default=os.environ.get("LQ_BASE_URL", DEFAULT_BASE))
    parser.add_argument("--user", default=os.environ.get("LQ_USERNAME", "admin"))
    parser.add_argument("--password", default=os.environ.get("LQ_PASSWORD", "admin123"))
    parser.add_argument("--dest", default=str(default_dest()))
    parser.add_argument("--run-backup-first", action="store_true")
    args = parser.parse_args()

    month_dir = pathlib.Path(args.dest) / time.strftime("%Y-%m")
    month_dir.mkdir(parents=True, exist_ok=True)

    login = request_json("POST", f"{args.base}/api/login", {"username": args.user, "password": args.password})
    token = login["token"]

    if args.run_backup_first:
        request_json("POST", f"{args.base}/api/backup/run", {}, token)
        time.sleep(2)

    status = request_json("GET", f"{args.base}/api/backup/status", token=token)
    recent = status.get("recent") or []
    if not recent:
        print("FAIL: no automatic backups on server")
        return 1

    latest = recent[0]
    stamp = latest["timestamp"]
    json_path = month_dir / f"jawdah-{stamp}.json"
    sqlite_path = month_dir / f"jawdah-{stamp}.sqlite3"

    download_file(f"{args.base}/api/backup/download?kind=json&timestamp={stamp}", token, json_path)
    download_file(f"{args.base}/api/backup/download?kind=sqlite&timestamp={stamp}", token, sqlite_path)

    manifest = {
        "downloaded_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "source": args.base,
        "timestamp": stamp,
        "created_at": latest.get("created_at"),
        "files": [
            {"kind": "json", "path": str(json_path), "bytes": json_path.stat().st_size},
            {"kind": "sqlite", "path": str(sqlite_path), "bytes": sqlite_path.stat().st_size},
        ],
    }
    manifest_path = month_dir / f"manifest-{stamp}.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"OK json={json_path}")
    print(f"OK sqlite={sqlite_path}")
    print(f"OK manifest={manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
