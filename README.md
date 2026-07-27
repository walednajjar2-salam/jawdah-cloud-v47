# Launch Quality LLC v68-stable

Real Estate, External Majlis Hospitality & Accounting — production backend + Arabic RTL dashboard.

**Current stable release:** see [RELEASE_v68.md](RELEASE_v68.md)

## Features

- Three portals: Real Estate · External Majlis · Accounting
- Properties, clients, contracts, invoices, accounts
- Majlis packages & condolence bookings (external venues — not rooms)
- Contract approval with auto invoice schedule
- Contract renewal workflow (`POST /api/renew_contract`)
- Financial modules: purchases, payroll, inventory, bank, smart receivables
- Backup / CSV export / health check

## Run locally

```bash
pip install -r requirements.txt
python server.py
```

Open: http://localhost:8765

## Deploy on Railway

See [RAILWAY.md](RAILWAY.md) or `DEPLOYMENT.txt`.

## Default users

- Existing production users are preserved — passwords are **not** reset on deploy.
- `admin` password comes from `ADMIN_PASSWORD` when first seeded only.
