# Launch Quality LLC v47

Real Estate & Hospitality Management System — production backend + Arabic RTL dashboard.

## Features

- Properties, clients, contracts, invoices, accounts
- Contract approval with auto invoice schedule
- **Contract renewal** workflow (`POST /api/renew_contract`)
- Financial modules: purchases, payroll, inventory, bank
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

- `admin` — password from `ADMIN_PASSWORD` environment variable (required for admin login)
- `razan.accounting` / `Jawdeh123`
