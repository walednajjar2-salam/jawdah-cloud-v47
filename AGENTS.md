# AGENTS.md

## Cursor Cloud specific instructions

### What this is
Single Python app: "Launch Quality LLC" / "Jawdah" — a Real Estate & Hospitality
management system (Arabic RTL dashboard + tenant portal). One process (`server.py`)
serves both the JSON `/api/...` surface and the static UI from `public/`. It uses only
the Python standard library and an embedded SQLite database (auto-created), so there are
no external services, databases, or package installs required.

### Run (dev)
- `python3 server.py` (there is no `python` alias on the VM; use `python3`).
- Default bind is `0.0.0.0:8765`. For local dev prefer:
  `JAWDAH_HOST=127.0.0.1 JAWDAH_PORT=8765 JAWDAH_DATA_DIR=./data JAWDAH_AUTO_BACKUP=0 python3 server.py`
- Open `http://localhost:8765` (redirects to `app.html`). Health check: `GET /api/health`.
- `JAWDAH_DATA_DIR` holds the SQLite file (`jawdah.sqlite3`) and backups; it is gitignored.

### Auth / seeded credentials (non-obvious)
- On first run the DB is seeded with hardcoded default users. The admin login is
  `admin` / `555555` (see `seed_if_empty` in `server.py`).
- The current `server.py` does NOT read the `ADMIN_PASSWORD` env var, despite what
  `README.md` / `.env.example` say — those docs are stale. Password overrides go through
  `lq_expand/security.py` env keys (e.g. `LQ_ADMIN_PASSWORD`, `LQ_PASSWORD_<USER>`),
  not `ADMIN_PASSWORD`.
- API auth is a Bearer token: `POST /api/login` returns `token`; pass it as
  `Authorization: Bearer <token>`.

### CRUD API shape (non-obvious)
- Generic CRUD lives at `/api/<table>` (e.g. `POST /api/properties`), not `/api/add_*`.
- Creating a property requires `building_no` (and other fields) — the server enforces
  required fields and returns `{"ok": false, "error": "Missing required field: ..."}`.

### Tests / lint
- No unit-test framework, CI, or linter config exists in this repo.
- Smoke scripts live in `scripts/`. Note `scripts/test_portal_local.py` is currently
  stale: it seeds a `clients.portal_token` column that no longer exists in `server.py`,
  so it fails with `table clients has no column named portal_token`. This is a
  pre-existing test-script issue, not an environment problem.
