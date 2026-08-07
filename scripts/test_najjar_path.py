#!/usr/bin/env python3
"""NAJJAR is published only under /najjar/ — legacy /auto-trading/*.html stays closed."""
from __future__ import annotations

import urllib.error
import urllib.request

ORIGIN = "http://127.0.0.1:8765"
CLOSED = "/closed"
NAJJAR = "/najjar"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch(path: str):
    opener = urllib.request.build_opener(NoRedirect)
    try:
        return opener.open(ORIGIN + path, timeout=5)
    except urllib.error.HTTPError as e:
        return e


def body_has(resp, needle: str) -> bool:
    try:
        return needle in resp.read(12000).decode("utf-8", "replace")
    except Exception:
        return False


def main() -> int:
    fails = 0
    try:
        urllib.request.urlopen(ORIGIN + "/api/health", timeout=3).read()
    except Exception as exc:
        print(f"server not reachable at {ORIGIN}: {exc}")
        return 1

    must_close = [
        "/",
        "/index.html",
        "/auto-trading/customer.html",
        "/auto-trading/login.html",
        "/auto-trading/platforms.html",
        "/auto-trading.html",
        "/app.html",
        "/erp",
    ]
    for path in must_close:
        resp = fetch(path)
        loc = resp.headers.get("Location", "")
        ok = resp.status in (301, 302) and loc.startswith(CLOSED)
        print(f"{'PASS' if ok else 'FAIL'}  {path:34s} -> {resp.status} {loc!r}")
        if not ok:
            fails += 1

    najjar_pages = [
        (NAJJAR + "/", "معرض"),
        (NAJJAR + "/customer.html", "معرض"),
        (NAJJAR + "/login.html", "تسجيل الدخول"),
        (NAJJAR + "/platforms.html", "المنصات"),
    ]
    for path, needle in najjar_pages:
        resp = fetch(path)
        ok = resp.status == 200 and body_has(resp, needle)
        print(f"{'PASS' if ok else 'FAIL'}  {path:34s} open ({needle})")
        if not ok:
            fails += 1

    resp = fetch("/auto-trading/auto-trading.css")
    ok = resp.status == 200
    print(f"{'PASS' if ok else 'FAIL'}  /auto-trading/auto-trading.css asset")
    if not ok:
        fails += 1

    try:
        data = urllib.request.urlopen(ORIGIN + "/api/auto-trading/showroom", timeout=5).read()
        ok = b'"ok"' in data
        print(f"{'PASS' if ok else 'FAIL'}  /api/auto-trading/showroom public")
        if not ok:
            fails += 1
    except urllib.error.HTTPError as e:
        print(f"FAIL  /api/auto-trading/showroom -> {e.code}")
        fails += 1

    try:
        urllib.request.urlopen(ORIGIN + "/api/dashboard", timeout=5)
        print("FAIL  /api/dashboard still open")
        fails += 1
    except urllib.error.HTTPError as e:
        ok = e.code == 503
        print(f"{'PASS' if ok else 'FAIL'}  /api/dashboard -> {e.code}")
        if not ok:
            fails += 1

    print()
    if fails:
        print(f"{fails} check(s) failed")
        return 1
    print("NAJJAR path: OK — live at /najjar/, legacy HTML closed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
