# Launch Quality LLC — Railway Deployment

## Quick deploy

1. Push this folder to GitHub: `walednajjar2-salam/jawdah-cloud-v47`
2. Railway → **New Project** → **Deploy from GitHub**
3. Select the repo and wait for build
4. Add variables (see below)
5. **Settings → Networking → Generate Domain**
6. Open `https://YOUR-APP.up.railway.app/api/health`

## Required variables

| Variable | Value |
|----------|-------|
| `JAWDAH_HOST` | `0.0.0.0` |
| `JAWDAH_DATA_DIR` | `/app/data` |

Railway sets `PORT` automatically — do not override it.

## Persistent database (recommended)

1. Railway project → **+ New** → **Volume**
2. Mount path: `/app/data`
3. Redeploy

SQLite database path: `/app/data/jawdah.sqlite3`

## Automatic daily backup (enabled by default)

Backups are stored on the same persistent volume:

- Directory: `/app/data/backups/daily/`
- Contents per archive: `jawdah.sqlite3`, `export.json`, `company_settings.json`, `manifest.json`
- Schedule: daily around **03:00 Asia/Muscat**
- Retention: **14 days** (older archives are removed automatically)

Optional variables:

| Variable | Default |
|----------|---------|
| `JAWDAH_AUTO_BACKUP` | `1` |
| `JAWDAH_BACKUP_HOUR` | `3` |
| `JAWDAH_BACKUP_RETAIN_DAYS` | `14` |
| `JAWDAH_BACKUP_TZ` | `Asia/Muscat` |

Status API (authenticated): `GET /api/backup/auto`  
Manual run (admin): `POST /api/backup/run`

## Health check

- Path: `/api/health`
- Configured in `railway.toml`

## Login (seed data)

- `admin` — set `ADMIN_PASSWORD` in Railway variables (required for admin login)
- `razan.accounting` / `Jawdeh123`

## Start command

```
python server.py
```

Also defined in `Procfile` and `railway.toml`.
