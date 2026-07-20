# Launch Quality LLC - Credentials Report

This report documents bootstrap usernames and initial passwords configured in code.

## Important security notes

- These are bootstrap credentials and may already be changed in production.
- Password hashes are stored in the database; current plain-text passwords cannot be retrieved from DB.
- On first secure deployment, rotate all passwords and keep only role-based access.
- Environment variables can override these defaults:
  - `LQ_PASSWORD_<USERNAME>` (per user, highest priority)
  - `LQ_ADMIN_PASSWORD` (admin)
  - `LQ_TEAM_BOOTSTRAP_PASSWORD` (team bootstrap)

## Seed and team users (code defaults)

| Username | Role | Bootstrap Password |
|---|---|---|
| `admin` | `admin` | `admin123` |
| `owner` | `owner` | `owner2015` |
| `ahmed.najjar` | `admin` | `Ahmed2026!` |
| `waleed.najjar` | `owner` | `Waleed2026!` |
| `ahoud.shuaili` | `operations` | `Ahoud2026!` |
| `amjad.jamoudi` | `operations` | `1122334455` |
| `operations` | `viewer` | `Operations2026!` |
| `ali.hospitality` | `maintenance` | `Ali2026!` |
| `maintenance` | `viewer` | `Maintenance2026!` |
| `viewer` | `operations` | `Viewer2026!` |
| `accountant` | `viewer` | `Accountant2026!` |
| `razan.accounting` | `viewer` | `Razan2026!` |
| `razan.shuaili` | `accountant` | `Razan2026!` |

## Deployment action checklist

1. Set per-user passwords via environment variables.
2. Force password change (`must_change_password`) for all bootstrap users.
3. Disable weak defaults by not enabling `LQ_ALLOW_DEFAULT_PASSWORDS`.
4. Remove or deactivate accounts not needed for current operations.
