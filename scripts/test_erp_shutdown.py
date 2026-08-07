#!/usr/bin/env python3
"""Every old ERP entry point must land on NAJJAR, never serve the retired shell."""
from __future__ import annotations

import subprocess
import sys
import urllib.request

ORIGIN = "http://127.0.0.1:8765"

# (path, expected Location prefix, must_not_contain in body)
CASES = [
    ("/app.html", "/auto-trading/login.html", "Launch Quality LLC"),
    ("/app", "/auto-trading/login.html", None),
    ("/portal-select.html", "/auto-trading/platforms.html", "Launch Quality"),
    ("/erp", "/auto-trading/platforms.html", None),
    ("/install.html", "/auto-trading/login.html", None),
    ("/quick-estate.html", "/auto-trading/login.html", None),
    ("/reset-cache.html", "/auto-trading/login.html", None),
]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch(path: str):
    opener = urllib.request.build_opener(NoRedirect)
    try:
        return opener.open(ORIGIN + path, timeout=5)
    except urllib.error.HTTPError as e:
        return e


def main() -> int:
    fails = 0
    try:
        urllib.request.urlopen(ORIGIN + "/api/health", timeout=3).read()
    except Exception as exc:
        print(f"server not reachable at {ORIGIN}: {exc}")
        return 1

    for path, expect_loc, banned in CASES:
        resp = fetch(path)
        loc = resp.headers.get("Location", "")
        body = resp.read(8000).decode("utf-8", "replace") if resp.status not in (301, 302) else ""
        ok = resp.status in (301, 302) and loc.startswith(expect_loc)
        if banned and banned in body:
            ok = False
        print(f"{'PASS' if ok else 'FAIL'}  {path:26s} -> {resp.status} {loc!r}")
        if not ok:
            fails += 1

    resp = fetch("/app.js")
    js = resp.read(200).decode("utf-8", "replace")
    ok = "auto-trading/login.html" in js
    print(f"{'PASS' if ok else 'FAIL'}  {'/app.js':26s} -> stub redirect")
    if not ok:
        fails += 1

    manifest = fetch("/manifest.webmanifest")
    raw = manifest.read(4000).decode("utf-8", "replace")
    ok = "/auto-trading/login.html" in raw and "/app.html" not in raw.split("shortcuts")[0]
    print(f"{'PASS' if ok else 'FAIL'}  {'/manifest.webmanifest':26s} -> NAJJAR manifest")
    if not ok:
        fails += 1

    print()
    if fails:
        print(f"{fails} check(s) failed")
        return 1
    print("ERP shutdown routing: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
