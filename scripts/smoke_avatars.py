#!/usr/bin/env python3
"""Smoke test for employee avatar system."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from server import avatar_initials, AVATAR_PRESET_IDS, load_avatar_catalog  # noqa: E402


def check_initials() -> None:
    cases = {
        # Family article الـ is stripped: الشعيلي → ش , النجار → ن
        "رزان سالم الشعيلي": "ر ش",
        "وليد محمد النجار": "و ن",
        "أحمد محمد النجار": "أ ن",
        "Single": "Si",
        "": "?",
    }
    for name, expected in cases.items():
        got = avatar_initials(name)
        assert got == expected, f"initials({name!r})={got!r} expected {expected!r}"
    print("OK initials")


def check_assets() -> None:
    cat = load_avatar_catalog()
    assert len(cat.get("men") or []) == 12
    assert len(cat.get("women") or []) == 12
    assert len(AVATAR_PRESET_IDS) == 24
    for gender in ("men", "women"):
        for item in cat[gender]:
            path = ROOT / "public" / item["url"].lstrip("/")
            assert path.exists(), f"missing {path}"
    print("OK avatar assets")


def check_api(base: str, user: str, password: str) -> None:
    def call(path: str, method: str = "GET", data: dict | None = None, token: str = "") -> dict:
        body = None if data is None else json.dumps(data).encode("utf-8")
        req = urllib.request.Request(
            base.rstrip("/") + "/api/" + path.lstrip("/"),
            data=body,
            method=method,
            headers={"Content-Type": "application/json", **({"Authorization": "Bearer " + token} if token else {})},
        )
        with urllib.request.urlopen(req, timeout=20) as res:
            return json.loads(res.read().decode("utf-8"))

    login = call("login", "POST", {"username": user, "password": password})
    token = login["token"]
    me = call("me", token=token)
    assert "avatar_type" in me["user"]
    cat = call("avatars/catalog", token=token)
    assert len(cat["catalog"]["men"]) == 12
    preset = call("me/avatar", "POST", {"mode": "preset", "preset": "m01"}, token=token)
    assert preset["user"]["avatar_type"] == "preset"
    assert preset["user"]["avatar_preset"] == "m01"
    init = call("me/avatar", "POST", {"mode": "initials"}, token=token)
    assert init["user"]["avatar_type"] == "initials"
    people = call("people", token=token)
    assert isinstance(people.get("people"), list)
    print("OK avatar API")


def main() -> int:
    check_initials()
    check_assets()
    base = (sys.argv[1] if len(sys.argv) > 1 else "").strip()
    if base:
        user = sys.argv[2] if len(sys.argv) > 2 else "waleed"
        password = sys.argv[3] if len(sys.argv) > 3 else "Waleed@2026!"
        try:
            check_api(base, user, password)
        except urllib.error.HTTPError as exc:
            print("API smoke skipped/failed:", exc)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
