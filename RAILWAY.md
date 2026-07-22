# Launch Quality LLC — Railway Deploy

> Production-ready guide with live links, map, and media placeholders.

## Quick deploy

1. Push this folder to GitHub (repository root = these files).
2. Open [Railway](https://railway.app) -> **New Project** -> **Deploy from GitHub repo**.
3. Select the repo. Railway detects Python via `requirements.txt` + `runtime.txt`.
4. In **Variables**, add:

| Variable | Value |
|----------|--------|
| `JAWDAH_HOST` | `0.0.0.0` |
| `JAWDAH_DATA_DIR` | `/app/data` |

`PORT` is injected automatically by Railway - do not set it manually.

5. **Settings -> Networking -> Generate Domain** to get a public URL like:
   `https://your-app.up.railway.app`
6. Open that URL in the browser. Login works immediately on the same domain.

## Live experience links (website + map + images)

Use your Railway domain and keep this section at the top for quick sharing:

- 🌐 **Live Website**: `https://your-app.up.railway.app`
- 🗺️ **Live Map (Nizwa example)**: `https://www.openstreetmap.org/?mlat=22.9333&mlon=57.5333#map=13/22.9333/57.5333`
- 📸 **Live Images (public assets)**:
  - `https://your-app.up.railway.app/assets/brand-logo-gold.png`
  - `https://your-app.up.railway.app/assets/login-portal-bg.png`
  - `https://your-app.up.railway.app/assets/app-icon-512.png`

For dynamic property photos uploaded from the app:
- 🏠 `https://your-app.up.railway.app/uploads/properties/<photo-file-name>`

## Health check

```text
GET https://your-app.up.railway.app/api/health
```

Expected:

```json
{
  "ok": true,
  "status": "healthy",
  "service": "production",
  "version": "Launch-Quality-LLC-v47-railway"
}
```

## Persistent database (recommended)

Without a volume, SQLite resets on redeploy.

1. Railway service -> **Volumes** -> **Add Volume**
2. Mount path: `/app/data`
3. Keep `JAWDAH_DATA_DIR=/app/data`

## Start command

```bash
python server.py
```

Already configured in `Procfile` and `railway.toml`.

## Login accounts (seed data)

| User | Password | Role |
|------|----------|------|
| `admin` | `admin123` | admin |
| `razan.accounting` | `Jawdeh123` | accountant |

Change the admin password after first login.

## GitHub Pages + Railway API (optional split)

If the frontend is on GitHub Pages and the backend on Railway:

1. Set Railway variable: `JAWDAH_CORS_ORIGIN=https://YOUR-USER.github.io`
2. Open GitHub Pages with:

```text
https://YOUR-USER.github.io/YOUR-REPO/?api=https://your-app.up.railway.app
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `502` / service not ready | Wait for deploy; check logs for `python server.py` |
| `404` on `/` | Redeploy latest code; fallback HTML is embedded in `server.py` |
| Login fails on GitHub Pages | Add `?api=https://your-railway-domain` |
| Data lost after redeploy | Add Railway volume at `/app/data` |

## UI polish checklist (icons + inputs + emoji)

To keep the product experience premium in production:

- ✅ Use icon-first placeholders in critical fields (login/search/location).
- ✅ Keep emoji semantic and functional, not decorative noise.
- ✅ Maintain bilingual clarity (Arabic + English) in the same input when useful.
- ✅ Preserve high contrast for icons/placeholders on dark backgrounds.
- ✅ Keep map and media links visible in docs for demo/readiness.
