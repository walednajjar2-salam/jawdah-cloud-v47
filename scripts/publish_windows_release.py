#!/usr/bin/env python3
"""One-command Windows release publisher for non-technical use.

What it does:
1) validates installer file exists
2) computes SHA256
3) copies installer to public/releases/windows/LaunchQuality-Setup.exe
4) updates public/releases/windows/latest.json
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RELEASE_DIR = ROOT / "public" / "releases" / "windows"
MANIFEST_PATH = RELEASE_DIR / "latest.json"
TARGET_INSTALLER_NAME = "LaunchQuality-Setup.exe"


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Publish Windows release manifest and installer")
    parser.add_argument("--installer", required=True, help="Path to built LaunchQuality-Setup.exe")
    parser.add_argument("--version", required=True, help="Version, e.g. 49.1.0")
    parser.add_argument(
        "--base-url",
        default="https://web-production-08d73.up.railway.app/releases/windows",
        help="Public base URL serving releases/windows",
    )
    parser.add_argument(
        "--notes",
        action="append",
        default=[],
        help="Release note line (repeat --notes for multiple lines)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    installer = Path(args.installer).expanduser().resolve()
    if not installer.exists():
        raise SystemExit(f"Installer not found: {installer}")
    if installer.suffix.lower() != ".exe":
        raise SystemExit("Installer must be .exe")

    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    target_installer = RELEASE_DIR / TARGET_INSTALLER_NAME
    if installer.resolve() != target_installer.resolve():
        shutil.copy2(installer, target_installer)
    digest = sha256_of(target_installer)

    manifest = {
        "channel": "stable",
        "version": str(args.version).strip(),
        "installer_url": f"{args.base_url.rstrip('/')}/{TARGET_INSTALLER_NAME}",
        "sha256": digest,
        "published_at": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "release_notes": args.notes
        or [
            "Stable production build.",
            "Auto-update metadata generated automatically.",
        ],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("Windows release published successfully:")
    print(f"- installer: {target_installer}")
    print(f"- sha256: {digest}")
    print(f"- manifest: {MANIFEST_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
