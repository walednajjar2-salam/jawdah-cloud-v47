"""Security helpers — passwords, bootstrap, device trust, MFA, rotation."""
from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Set, Tuple


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
    weak = {"password", "1234567890", "admin123", "owner2015", "001970"}
    if pwd.lower() in weak:
        return "كلمة المرور ضعيفة — اختر كلمة أقوى"
    if pwd.isdigit():
        return "أضف حروفاً مع الأرقام"
    return None


def password_max_age_days() -> int:
    raw = _env("LQ_PASSWORD_MAX_AGE_DAYS") or "90"
    try:
        return max(0, int(raw))
    except ValueError:
        return 90


def password_needs_rotation(password_changed_at: Any, *, created_at: Any = None) -> bool:
    """True when password is older than LQ_PASSWORD_MAX_AGE_DAYS (0 = disabled)."""
    max_days = password_max_age_days()
    if max_days <= 0:
        return False
    stamp = str(password_changed_at or created_at or "").strip()
    if not stamp:
        return True
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            changed = datetime.strptime(stamp[:19], fmt)
            return datetime.now() - changed > timedelta(days=max_days)
        except ValueError:
            continue
    return False


def mfa_roles() -> Set[str]:
    raw = _env("LQ_MFA_ROLES") or "owner,admin"
    return {x.strip().lower() for x in raw.split(",") if x.strip()}


def mfa_enforce_mode() -> str:
    """
    off | soft | strict
    soft (default): require MFA for privileged roles when device is untrusted,
    but skip if OTP delivery fails so login is never locked out.
    """
    mode = (_env("LQ_MFA_ENFORCE") or "soft").strip().lower()
    if mode in ("off", "0", "false", "no"):
        return "off"
    if mode in ("strict", "hard", "1", "true", "on"):
        return "strict"
    return "soft"


def role_requires_mfa(role: str) -> bool:
    if mfa_enforce_mode() == "off":
        return False
    return str(role or "").strip().lower() in mfa_roles()


def normalize_device_fingerprint(raw: Any) -> str:
    value = str(raw or "").strip()
    if not value:
        return ""
    if len(value) > 200:
        value = value[:200]
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return digest


def device_trust_days() -> int:
    try:
        return max(1, int(_env("LQ_DEVICE_TRUST_DAYS") or "30"))
    except ValueError:
        return 30


def pending_login_ttl_seconds() -> int:
    try:
        return max(60, int(_env("LQ_PENDING_LOGIN_TTL") or "300"))
    except ValueError:
        return 300


def security_status_payload(user: Dict[str, Any], *, trusted_device: bool = False) -> Dict[str, Any]:
    return {
        "password_max_age_days": password_max_age_days(),
        "password_needs_rotation": password_needs_rotation(
            user.get("password_changed_at"),
            created_at=user.get("created_at"),
        ),
        "must_change_password": bool(user.get("must_change_password")),
        "mfa_enforce": mfa_enforce_mode(),
        "mfa_roles": sorted(mfa_roles()),
        "role_requires_mfa": role_requires_mfa(str(user.get("role") or "")),
        "trusted_device": bool(trusted_device),
        "device_trust_days": device_trust_days(),
    }
