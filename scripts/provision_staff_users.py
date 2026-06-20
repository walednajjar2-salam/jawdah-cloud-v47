#!/usr/bin/env python3
"""Create or update Launch Quality staff users on the live API."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = "https://web-production-08d73.up.railway.app"
ADMIN_USER = "owner"
ADMIN_PASS = "owner2015"

STAFF = [
    ("yaqoub.hashem", "Yaqoub Abdullah Abdo Ali Hashem", "admin", "Yaqoub2026!"),
    ("ahmed.najjar", "Ahmed Al-Najjar", "admin", "Ahmed2026!"),
    ("waleed.najjar", "Waleed Al-Najjar", "admin", "Waleed2026!"),
    ("razan.treasurer", "Razan", "accountant", "Razan2026!"),
    ("ohood.reception", "Ohood Saad Al-Shammami", "operations", "Ohood2026!"),
    ("mohammed.sudani", "Mohammed Al-Sudani", "operations", "Mohammed2026!"),
    ("ali.supervisor", "Ali Mohammed Ali Mohammed", "operations", "Ali2026!"),
    ("abd.yousuf", "Abd Yousuf Al-Shammami", "maintenance", "Abd2026!"),
    ("mohammed.rabani", "Mohammed Ahmed Al-Rabani", "maintenance", "MRabani2026!"),
    ("nizar.shammami", "Nizar Bassam Al-Shammami", "maintenance", "Nizar2026!"),
    ("mohammed.siraj", "Mohammed Saleh Siraj Al-Noor", "maintenance", "MSiraj2026!"),
    ("mohammed.jadoul", "Mohammed Jadoul Aslam", "maintenance", "MJadoul2026!"),
]


def request(method: str, path: str, token: str | None = None, body: dict | None = None):
    url = f"{BASE}/api/{path.lstrip('/')}"
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    login = request("POST", "login", body={"username": ADMIN_USER, "password": ADMIN_PASS})
    token = login["token"]
    existing = {u["username"]: u for u in request("GET", "bootstrap", token=token).get("data", {}).get("users", [])}
    ok = 0
    for username, name, role, password in STAFF:
        try:
            if username in existing:
                uid = existing[username]["id"]
                request("PUT", f"users/{uid}", token=token, body={
                    "username": username, "name": name, "role": role, "password": password, "active": True
                })
                print(f"UPDATED  {username} ({role})")
            else:
                request("POST", "users", token=token, body={
                    "username": username, "name": name, "role": role, "password": password, "active": True
                })
                print(f"CREATED  {username} ({role})")
            ok += 1
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="replace")
            print(f"FAILED   {username}: {detail}", file=sys.stderr)
    print(f"Done: {ok}/{len(STAFF)} users provisioned.")
    return 0 if ok == len(STAFF) else 1


if __name__ == "__main__":
    raise SystemExit(main())
