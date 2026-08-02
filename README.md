# Launch Quality LLC v70.4

Real Estate, External Majlis Hospitality & Accounting — production backend + Arabic RTL dashboard.

**Current release:** `Launch-Quality-LLC-v70.4-finish-remaining`  
**Live:** https://web-production-08d73.up.railway.app/fresh

## Features

- Three portals: Real Estate · External Majlis · Accounting
- Properties, clients, contracts, invoices, accounts
- Majlis packages & condolence bookings (external venues — not rooms)
- Contract approval with auto invoice schedule
- Contract renewal workflow (`POST /api/renew_contract`)
- Financial modules: purchases, payroll, inventory, bank, smart receivables
- Backup / CSV export / health check
- Native staff apps: Windows (`/get-windows`) + Android (`/get-android`)

## Run locally

```bash
pip install -r requirements.txt
python server.py
```

Open: http://localhost:8765

## Deploy on Railway

See [RAILWAY.md](RAILWAY.md) or `DEPLOYMENT.txt`.

Optional owner steps (Bucket / Postgres / webhook): documented in `RAILWAY.md`.

## Default users

- Existing production users are preserved — passwords are **not** reset on deploy.
- `admin` password comes from `ADMIN_PASSWORD` when first seeded only.
