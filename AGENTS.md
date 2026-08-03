# AGENTS.md

## Cursor Cloud specific instructions

Launch Quality LLC ("Jawdah") is a single-process Python monolith. `server.py` uses the
stdlib `http.server.ThreadingHTTPServer` (no web framework) and serves **both** the JSON
API (`/api/*`) and all static frontend assets in `public/`. Data is stored in SQLite,
auto-created in-process. `psycopg`/`boto3` (from `requirements.txt`) are only needed for the
optional Postgres shadow mirror and S3 object storage; the core product boots on the stdlib
alone. Runtime is Python 3.12. There is no separate frontend build, no lint config, and no
automated test framework.

### Running the server (the only required service)

Standard start command is `python server.py` (see `README.md` / `Procfile`). For a local dev
run in this environment, set a writable data dir and a fixed port first:

```bash
export JAWDAH_DATA_DIR=./data JAWDAH_HOST=127.0.0.1 JAWDAH_PORT=8765 JAWDAH_AUTO_BACKUP=0
python server.py
```

- Default port is `8765` (`PORT` or `JAWDAH_PORT`). Health check: `GET /api/health` (look for
  `ok:true`, `platform_ready:true`).
- Entry pages: `/` → `/app.html` (main SPA), `/fresh` (clears cache then logs in),
  `/portal-select.html` (Real Estate / Accounting / Majlis chooser).
- `JAWDAH_AUTO_BACKUP=0` disables the in-process backup scheduler — recommended for local runs.

### Login / seeding gotchas (non-obvious)

- Team accounts are force-seeded on first run by `ensure_team_users()` via
  `force_user_credentials()`, which **overrides** the `LQ_ADMIN_PASSWORD` bootstrap path. On a
  fresh DB the `admin` account password is `555555` (username `admin`). Other seeded accounts
  have their own defaults in `ensure_team_users()`.
- Override any seeded password with `LQ_USER_PASSWORD_<USERNAME>` (e.g.
  `LQ_USER_PASSWORD_ADMIN`), **not** `ADMIN_PASSWORD`/`LQ_ADMIN_PASSWORD` (those only apply to
  the generic bootstrap path that team seeding overrides). Docs/`.env.example` mislabel this as
  `ADMIN_PASSWORD`.
- Login: `POST /api/login {username,password}` → returns a Bearer `token`; pass it as
  `Authorization: Bearer <token>` on API calls.
- Data is CRUD over generic REST endpoints, e.g. `POST /api/properties`. Note the UI/backend is
  Arabic RTL and some enum values are stored/returned in Arabic (e.g. status `Vacant` → `شاغرة`).

### Testing notes

- `scripts/test_portal_local.py` is **stale**: it seeds `clients.portal_token`/`portal_active`
  columns that no longer exist in the schema, so it fails at setup (`table clients has no column
  named portal_token`). This is a pre-existing script bug, not an environment problem. Prefer
  smoke-testing via `curl` against `/api/health`, `/api/login`, and CRUD endpoints.
- `fido2` is imported optionally in `server.py` and is **not** in `requirements.txt`; WebAuthn
  endpoints stay disabled unless it is installed separately. All other MFA/TOTP is stdlib-based.
