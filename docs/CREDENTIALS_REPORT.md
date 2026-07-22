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

## Seed and team users (code defaults - 6 accounts only)

| Username | Role | Bootstrap Password |
|---|---|---|
| `waleed` | `admin` | `111111` |
| `yaqoub` | `owner` | `owner2015` |
| `razan` | `accountant` | `222222` |
| `amjad` | `operations` | `333333` |
| `ali` | `maintenance` | `444444` |
| `admin` | `admin` | `555555` |

## Deployment action checklist

1. Set per-user passwords via environment variables.
2. Disable or rotate bootstrap passwords in production after handover.
3. Keep only required active accounts for operations.
4. Do not store plaintext credentials in any package artifact.
