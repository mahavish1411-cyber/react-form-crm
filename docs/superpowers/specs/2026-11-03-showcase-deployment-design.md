# Showcase Deployment and Hardening — Design

## Intent and why
React Form CRM (employees, attendance, payroll) is a portfolio project. People arriving from LinkedIn must be able to open a live link and use the app within seconds. Today it only runs locally: the frontend hardcodes `http://localhost:5000/api`, the backend is undeployed, and there is no auth, so a public deployment would be open to anyone and destructible. The goal is a live, safe-to-play-with, well-presented, well-tested demo.

## Goals
- Live deployment: backend on Render, database on MongoDB Atlas (free M0), frontend stays on Vercel.
- Visitors land on a login page with a one-click "Try the demo" button (no sign-up) and enter as an `admin` demo user.
- Real JWT authentication underneath, protecting every `/api` route except health and login.
- Visitors can add/edit/delete employees, record attendance, and generate/recalculate/pay payroll.
- Demo data is fake and lives in a dedicated demo database. A seed script populates it and it resets on a schedule (daily). Destructive endpoints are rate-limited.
- Fix the known gaps (below), add unit tests for payroll maths, and split oversized files.
- Polished README: live link, screenshots, architecture note, payroll formula, note about Render cold start.

## Non-goals
- Employee self-service portal, email notifications, payroll export.
- Holidays and leave modelling (weekends remain the only non-working days).
- Migrating off MongoDB or to Firebase.
- Multi-tenant support or production-grade HR compliance.

## Anti-goals (failure even if it technically works)
- A login wall or sign-up step that makes a recruiter bounce.
- Any real personal or payroll data in the deployed database.
- A visitor being able to permanently wreck the demo (it must self-heal via reset).
- The first request after Render sleep looking like a broken app (needs a visible loading/"waking up" state).

## Decisions made with the owner
- Platform: Render (backend), Atlas (db), Vercel (frontend). Chosen over Firebase to avoid a data-layer rewrite.
- Auth: JWT, email + password, bcrypt-hashed, users stored in MongoDB.
- Roles: `admin` (full access) and `viewer` (read-only). The demo button logs in as `admin`.
- Scope: all gaps from the repo analysis, delivered in three stages.

## Stages
1. **Deployment readiness**
   - `VITE_API_URL` env var plus a single shared axios instance replacing hardcoded URLs in all pages.
   - CORS restricted to the Vercel origin(s) via env var.
   - `.env.example` for backend and frontend; Render config; health route used for Render checks.
   - Cleanup: dedupe `.gitignore` and remove the stray pasted command, remove `Employees.before-fix.jsx`, remove or implement the empty `EmployeeForm.jsx`/`Navbar.jsx`, untrack `frontend/.browser-payroll-tools/`, fix README structure/name.
   - Cold-start "waking up" UI state.
2. **Security and demo mode**
   - `User` model, login endpoint, JWT middleware, role checks (`viewer` blocked from writes).
   - "Try the demo" endpoint/flow issuing an admin token for the demo user.
   - Input validation on all write endpoints; rate limiting on writes; helmet.
   - Seed + scheduled reset script for demo data.
3. **Payroll/attendance fixes, tests, refactor**
   - Validate `month` and `paymentStatus` on the payroll list endpoint; reject negative `otherDeduction` and other bad numeric input.
   - Remove N+1 queries in bulk payroll generation (batch-fetch attendance and existing payrolls).
   - Unit tests (with a `test` script) for payroll calculation: weekday counting, absent/half-day deductions, caps at gross, past/current/future month behavior.
   - Split `attendanceController.js`, `payrollController.js`, and the large pages into smaller modules; extract the repeated populate field list into one constant.

## Constraints
- Keep CommonJS backend and existing stack (React 19, Vite, Express 5, Mongoose 9).
- Free-tier hosting; must tolerate Render cold starts.
- Behavior of payroll calculations must not change during refactor (tests lock it in first).
- No secrets committed.

## Left to the builder
- Choice of validation library, rate-limit library, and test runner.
- Exact reset mechanism (Render cron job vs in-process scheduler) and schedule time.
- Styling of the login page and loading state, consistent with existing CSS.
- File/module layout of the refactor.

## Builder-check resolutions (assistant's calls, not owner decisions)
- **Demo login:** public, rate-limited `POST /api/auth/demo` issues a 1–2 hour admin JWT. One shared demo database for all visitors (no per-visitor isolation); it resets daily. The `viewer` role exists in the backend and is covered by tests but is not reachable from the UI.
- **Demo-only deployment:** the whole deployment is the demo. The seed/reset script refuses to run unless `DEMO_MODE=true`, so it can never wipe a non-demo database.
- **Seed content:** about 12 fake employees across 4–5 departments, 3 months of attendance (a mix of present, late, half-day, absent), and payroll generated for the two previous months, with a mix of Paid and Pending. The current month is left ungenerated so visitors can generate it.
- **Accounts and secrets:** the owner creates the Render, Atlas and Vercel accounts and sets `JWT_SECRET`, `MONGODB_URI` and the CORS origin. The builder provides a `render.yaml` Blueprint, `.env.example` files and a short step-by-step deploy guide. CORS accepts the Vercel production origin and, optionally, a pattern for preview URLs, via env var.
- **Cold start:** UI "waking up" state is the primary mitigation. An external keep-alive pinger is optional and documented in the README, not required.
- **Tests:** backend only (payroll maths, auth/role middleware, validation). No frontend test setup; the login route guard is verified manually.
