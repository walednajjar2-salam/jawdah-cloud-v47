"""Phase 1 — security helpers (passwords, bootstrap, validation)."""
from __future__ import annotations

import os
import secrets
from typing import Optional, Tuple


def _env(key: str) -> str:
    return (os.environ.get(key) or "").strip()


def allow_default_passwords() -> bool:
    return _env("LQ_ALLOW_DEFAULT_PASSWORDS") == "1"


def user_password_env_key(username: str) -> str:
    return f"LQ_PASSWORD_{username.upper().replace('.', '_').replace('-', '_')}"


def user_email_env_key(username: str) -> str:
    return f"LQ_EMAIL_{username.upper().replace('.', '_').replace('-', '_')}"


def resolve_user_email(username: str, fallback: str = "") -> str:
    return _env(user_email_env_key(username)) or (fallback or "").strip()


def resolve_bootstrap_password(username: str, role: str, legacy_default: str) -> Tuple[str, bool]:
    """
    Return (password, must_change_password).
    Priority: per-user env → admin env → team bootstrap → legacy (if allowed) → random.
    """
    per_user = _env(user_password_env_key(username))
    if per_user:
        return per_user, False

    if username == "admin" and _env("LQ_ADMIN_PASSWORD"):
        return _env("LQ_ADMIN_PASSWORD"), False

    team_pwd = _env("LQ_TEAM_BOOTSTRAP_PASSWORD")
    if team_pwd:
        return team_pwd, True

    if allow_default_passwords() and legacy_default:
        return legacy_default, True

    return secrets.token_urlsafe(14), True


def validate_new_password(password: str, username: str) -> Optional[str]:
    pwd = (password or "").strip()
    if len(pwd) < 10:
        return "كلمة المرور يجب أن تكون 10 أحرف أو أكثر"
    if username and pwd.lower() == username.lower():
        return "لا تستخدم اسم المستخدم ككلمة مرور"
    weak = {"password", "1234567890", "admin123", "owner2015"}
    if pwd.lower() in weak:
        return "كلمة المرور ضعيفة — اختر كلمة أقوى"
    if pwd.isdigit():
        return "أضف حروفاً مع الأرقام"
    return None
