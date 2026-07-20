# Launch Quality LLC v49 — Railway Production Runbook

## Quick Deploy

1. Push branch to GitHub repo `walednajjar2-salam/jawdah-cloud-v47`
2. Railway -> **Deploy from GitHub**
3. Add/verify environment variables below
4. Confirm Volume mount on `/app/data`
5. Trigger deploy and verify:
   - `GET /api/health`
   - `GET /api/backup/status`
   - `GET /api/permissions/audit` (admin)

## Required Environment Variables

| Variable | Value |
|---|---|
| `JAWDAH_HOST` | `0.0.0.0` |
| `JAWDAH_DATA_DIR` | `/app/data` |
| `JAWDAH_BACKUP_DIR` | `/app/data/backups` |
| `ADMIN_PASSWORD` | `<strong password>` |

Railway sets `PORT` automatically.

## Backup + Storage (v49)

- Auto backup switch: `JAWDAH_AUTO_BACKUP=1`
- Interval hours: `JAWDAH_BACKUP_INTERVAL_HOURS=24`
- Retention count: `JAWDAH_BACKUP_RETENTION=30`
- Low space warning threshold (GB): `JAWDAH_STORAGE_WARN_GB=2`
- Backup files are saved as:
  - `jawdah-YYYYMMDD-HHMMSS.json`
  - `jawdah-YYYYMMDD-HHMMSS.sqlite3`

Operational endpoints:
- `POST /api/backup/run` (manual backup)
- `GET /api/backup/status` (storage + integrity summary)
- `POST /api/backup/verify` (restore simulation)

## Volume Sizing Guidance

- Minimum: `20GB`
- Recommended for production: `50GB` when property photos and long retention are enabled
- Mount path must remain `/app/data` to keep SQLite + uploads + backups persistent

## Health / Smoke Checklist

After each production deploy:
1. Login with admin
2. Create client -> create contract draft -> approve contract
3. Generate invoice from contract -> collect payment
4. Run backup now -> download JSON + SQLite
5. Confirm no critical alerts in `/api/backup/status` storage section
