# Employee CRM — Employees, Attendance & Payroll

A full-stack HR workspace: manage employees, track daily attendance, and generate monthly payroll with printable payslips.

**Live demo:** _add your Vercel URL here_ → click **Try the demo** (no sign-up). Demo data is fake and **resets daily**.

> Hosted on free tiers: the first request after idle can take up to a minute while the API wakes up. A banner tells you when that happens.

<!-- Add screenshots to docs/screenshots/ and link them here:
![Dashboard](docs/screenshots/dashboard.png)
![Payroll](docs/screenshots/payroll.png)
-->

## Features

- **Dashboard** — employee totals, active/inactive counts, departments, recent activity
- **Employees** — create, edit, delete, status, department/designation, salary structure
- **Attendance** — check-in, breaks, check-out; late / half-day / absent resolution; monthly summaries
- **Payroll** — single or bulk generation, recalculation, paid/pending tracking, payslips (print / save as PDF)
- **Reports, Settings, Help Center**
- **Auth** — JWT login, one-click demo login, `admin` (full) and `viewer` (read-only) roles
- **Safe public demo** — rate-limited writes, validated input, seeded fake data, automatic daily reset

## Architecture

```text
Vercel (React + Vite)  ──HTTPS──▶  Render (Express API)  ──▶  MongoDB Atlas
        │                               │  JWT auth, validation, rate limits
        └─ shared axios client          └─ demo lifecycle: seed on empty DB,
           (VITE_API_URL, token,           reset daily 03:00 UTC / on wake-up
            "waking up" banner)
```

```text
backend/
  server.js               app wiring, DB reconnect, health
  routes/ controllers/    HTTP layer
  middleware/             auth (JWT, roles), validate (zod), rate limits
  services/payrollCalculator.js   pure, unit-tested payroll maths
  scripts/                seed (guarded by DEMO_MODE) + demo lifecycle
  models/ validation/ utils/ constants/ tests/
frontend/src/
  api/client.js           axios instance, token, cold-start state
  auth/                   AuthContext, RequireAuth
  pages/ components/ layouts/
```

## Payroll calculation

```text
Gross          = Basic + Allowance
Per-day salary = Gross / (Mon–Fri days in the month)
Attendance deduction = Per-day × absent days + Per-day × 0.5 × half-days   (capped at Gross)
Total deduction      = Attendance + Employee fixed + Other                  (capped at Gross)
Net            = Gross − Total deduction                                    (never below 0)
```

- A working day with no attendance record is **absent**; under 240 worked minutes is a **half day**; any lateness above that is **late** (not deducted).
- Past months evaluate every weekday; the current month evaluates days before today (today only if a record exists); future months have no absences.
- Saturday and Sunday are the only non-working days (no holiday/leave model yet).

Example (Sept 2026, 22 weekdays): gross 33,000 → 1,500/day; 2 absent + 1 half-day → 3,750 attendance deduction.

## API

All `/api/*` routes except `/api/health`, `/api/auth/login` and `/api/auth/demo` require `Authorization: Bearer <token>`. `viewer` tokens can only `GET`.

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/health` | DB status (used by Render) |
| POST | `/api/auth/login` | `{email, password}` |
| POST | `/api/auth/demo` | demo admin token (only when `DEMO_MODE=true`) |
| GET | `/api/auth/me` | current user |
| GET/POST | `/api/employees` | list / create |
| PUT/DELETE | `/api/employees/:id` | update / delete |
| GET | `/api/attendance`, `/api/attendance/monthly` | daily / monthly |
| POST / PUT | `/api/attendance/check-in`, `start-break`, `end-break`, `check-out` | |
| GET | `/api/payroll?month=YYYY-MM&paymentStatus=Pending\|Paid` | validated |
| GET | `/api/payroll/:id` | |
| POST | `/api/payroll/generate`, `/api/payroll/generate-all` | |
| PUT | `/api/payroll/:id/recalculate`, `/api/payroll/:id/paid` | |

## Run locally

See [docs/DEPLOY.md](docs/DEPLOY.md#local-development). Tests: `npm test --prefix backend`.

## Deploy

Step-by-step (Atlas + Render + Vercel): [docs/DEPLOY.md](docs/DEPLOY.md).

## Tech

React 19, Vite, React Router, axios · Node, Express 5, Mongoose 9, zod, helmet, express-rate-limit, jsonwebtoken, bcryptjs · MongoDB Atlas · Node test runner.

## Known limitations

- No holiday or leave model; weekends only.
- Single shared demo database (all visitors see the same data until the daily reset).
- Roles are `admin` and `viewer`; `viewer` is not exposed in the UI.

## Author

GitHub: mahavish1411-cyber
