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

## Health check

- Path: `/api/health`
- Configured in `railway.toml`

## Login (seed data)

- `admin` / `admin123`
- `razan.accounting` / `Jawdeh123`

## Start command

```
python server.py
```

Also defined in `Procfile` and `railway.toml`.
