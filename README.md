# Fev's Diner Schedule

Staff schedule organizer for Kitchen, Dining, and OJT teams.

## What's included

### Steps 1–2
- Supabase schema + seed data
- Public read-only schedule at `/` (dark UI, team cards, date + team filters)

### Step 3
- Local username/password login for manager & supervisors
- Protected `/admin` area

### Step 4
- Manager employee roster at `/admin/employees`
- Local persistence in `.data/employees.json`

### Step 5
- Weekly template editor at `/admin/template`
- Per team; supervisors edit only their teams
- Version history with effective dates
- Day tabs (Sun–Sat), off days, 1–3 time segments
- Local persistence in `.data/templates.json`

### Step 6
- Daily schedule editor at `/admin/daily` (defaults to tomorrow)
- Auto-fills from the active weekly template version
- Edit times / off days / add segments; part-time for one day
- Reset day to template; public `/` reads the same local store

### Step 7
- Export daily schedule to **one Google Sheet tab** (per-team saves merge into the same sheet)
- Auto-push after **Save day** when Google credentials are in `.env.local`
- Columns: Date, Day, Team, Employee Name, Type, TIME-IN/OUT (1 & 2)

## Quick start (demo mode)

No database required.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Test logins

| Role | Username | Password | Teams |
|---|---|---|---|
| Manager | `manager` | `1234` | All |
| Kitchen supervisor | `kitchen` | `1234` | Kitchen |
| Dining supervisor | `dining` | `1234` | Dining + OJT |

Use the settings icon on the public page, or go to `/login`.

## Local Supabase (optional)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
npm run db:start
npm run db:reset
```

Copy keys into `.env.local` (see `.env.local.example`), then restart the dev server.

## Google Sheets export (Step 7)

1. Create a [Google Cloud service account](https://cloud.google.com/iam/docs/service-account-overview) and enable the **Google Sheets API**.
2. Download the JSON key and set `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env.local` (minified one-line JSON).
3. Create or open a spreadsheet; copy its ID from the URL into `GOOGLE_SHEETS_SPREADSHEET_ID`.
4. **Share the spreadsheet** with the service account email (`client_email` in the JSON) as **Editor**.
5. Optional: set `GOOGLE_SHEETS_TAB_NAME` if not using `Sheet1`.

On `/admin/daily`, **Save day** publishes the **team you saved** to Google Sheets when credentials are configured. Other teams and other dates already in the sheet are left unchanged. Save each team separately to build a full day in the sheet.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run db:start` | Start local Supabase |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:reset` | Reset DB, run migrations + seed |

## Project structure

```
src/
  app/page.tsx              # Public schedule
  app/login/                # Staff login
  app/admin/                # Protected admin shell
  components/schedule/      # Public schedule UI
  components/auth/          # Login form
  lib/auth/                 # Session, demo users, guards
  lib/schedule/             # Queries + demo data
  lib/sheets/               # Google Sheets export
  proxy.ts                  # Protects /admin (Next.js 16 Proxy)
supabase/
  migrations/               # Schema (incl. profiles)
  seed.sql                  # Sample data
```

## Next steps

- Later: Replace local login with Google SSO; move data stores to Supabase
# staff-scheduling
# staff-scheduling
