# Showcase Deployment and Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the CRM as a safe, self-resetting public demo (Render + Atlas + Vercel) with real JWT auth and a one-click demo login, and fix the known payroll/attendance/code-quality gaps.

**Architecture:** Express API gains `auth` (JWT, roles) middleware in front of all `/api` routes except health and login. Payroll maths is extracted into pure, tested functions before any behavior fix or refactor. The frontend gets one shared axios client (env-driven base URL, token header, cold-start handling) and a login page with a "Try the demo" button. A guarded seed script resets demo data on a Render cron schedule.

**Tech Stack:** Node (CommonJS), Express 5, Mongoose 9, React 19, Vite 8, axios. New: `jsonwebtoken`, `bcryptjs`, `helmet`, `express-rate-limit`, `zod` (validation). Tests use the built-in `node:test` runner already used in `backend/tests/connection.test.js`.

**Spec:** `docs/superpowers/specs/2026-11-03-showcase-deployment-design.md`

## Global Constraints

- Backend stays CommonJS; frontend stays React 19 + Vite 8; no new frontend test framework (backend tests only).
- Free-tier hosting: Render (backend), MongoDB Atlas M0, Vercel (frontend). Must tolerate Render cold starts.
- Payroll results must not change during refactor: characterization tests (Task 10) land before any payroll code moves.
- Demo token lifetime 1–2 hours; roles are exactly `admin` and `viewer`; `viewer` is not reachable from the UI.
- `DEMO_MODE=true` is required for the seed/reset script to run; deployment is demo-only with one shared database.
- Weekends (Sat/Sun) remain the only non-working days; holidays and leave are out of scope.
- No secrets committed; env names: `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `DEMO_MODE`, `PORT` (backend), `VITE_API_URL` (frontend).
- Seed content: about 12 fake employees across 4–5 departments, 3 months of attendance (present/late/half-day/absent mix), payroll generated for the two previous months with a Paid/Pending mix, current month left ungenerated.
- Test command is `npm test` in `backend/` (`node --test tests/`).

## Review Focus

1. Expired, tampered, or missing JWT on any protected route returns 401 (not 500, not data). (Task 6)
2. `viewer` token on any POST/PUT/DELETE returns 403 and changes nothing. (Task 6)
3. Seed/reset invoked without `DEMO_MODE=true`, or with an empty `MONGODB_URI`, exits non-zero without touching the DB. (Task 9)
4. Payroll for an employee with zero working days in range, gross of 0, or deductions larger than gross never yields negative or NaN values. (Task 10)
5. Payroll list with malformed `month` (`2026-13`, `abc`, `2026-1`) or unknown `paymentStatus` returns 400, not an empty list or 500. (Task 11)

---

## Stage 1 — Deployment readiness

### Task 1: Shared API client and env-driven base URL

**Files:**
- Create: `frontend/src/api/client.js`, `frontend/.env.example`
- Modify: `frontend/src/pages/Attendance.jsx:4`, `Dashboard.jsx:9-10`, `Employees.jsx:4-5`, `Payroll.jsx:4`, `Reports.jsx:22`

**Interfaces:**
- Produces: `api` (default export of `client.js`) — an axios instance with `baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"`, `timeout: 15000`. Also exports `API_BASE_URL: string`. Later tasks add interceptors to this file.

- [ ] **Step 1:** Create `client.js` exporting `API_BASE_URL` and the default `api` instance as above; create `.env.example` with `VITE_API_URL=http://localhost:5000/api`.
- [ ] **Step 2:** Replace every hardcoded URL listed above with `api` (paths relative to `/api`, e.g. `api.get("/employees")`). Reports.jsx currently reads `VITE_API_BASE_URL`; switch it to the shared client so there is one variable.
- [ ] **Step 3:** Run `grep -rn "localhost:5000" frontend/src`. Expected: only the fallback inside `client.js`.
- [ ] **Step 4:** Run `npm run build` and `npm run lint` in `frontend/`. Expected: both succeed with no new errors.
- [ ] **Step 5:** Commit `feat(frontend): shared api client with VITE_API_URL`.

### Task 2: CORS allowlist, health route, Render blueprint

**Files:**
- Modify: `backend/server.js:60` (CORS), `backend/package.json` (add `test` script)
- Create: `backend/.env.example`, `render.yaml`, `backend/tests/cors.test.js`, `backend/utils/corsOptions.js`

**Interfaces:**
- Produces: `buildCorsOptions(envValue: string | undefined): cors.CorsOptions` in `backend/utils/corsOptions.js`. `envValue` is a comma-separated list of origins; entries may contain `*` as a wildcard (for Vercel preview URLs, e.g. `https://*.vercel.app`). Unset/empty means allow only `http://localhost:5173`. Requests with no `Origin` header are allowed (curl, health checks).

- [ ] **Step 1:** Write `cors.test.js` asserting: listed origin allowed; unlisted origin rejected; wildcard entry matches `https://my-app-git-x.vercel.app`; empty env allows only `http://localhost:5173`; no-Origin allowed.
- [ ] **Step 2:** Run `npm test` in `backend/`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `buildCorsOptions`; wire `app.use(cors(buildCorsOptions(process.env.CORS_ORIGINS)))` in `server.js`. Add `"test": "node --test tests/"` to `package.json`.
- [ ] **Step 4:** Create `backend/.env.example` (all backend env names from Global Constraints, no values) and `render.yaml` defining the web service (rootDir `backend`, build `npm install`, start `npm start`, health check path `/api/health`, env keys declared with `sync: false` for secrets). The cron job is added in Task 9.
- [ ] **Step 5:** Run `npm test`. Expected: PASS, including the existing connection test.
- [ ] **Step 6:** Commit `feat(backend): CORS allowlist, env example, render blueprint`.

### Task 3: Repository cleanup

**Files:**
- Modify: `.gitignore`, `README.md` (structure block and repo name only; full rewrite is Task 15)
- Delete: `frontend/src/components/EmployeeForm.jsx`, `frontend/src/components/Navbar.jsx` (both empty), `frontend/.browser-payroll-tools/Employees.before-fix.jsx`
- Untrack: `frontend/.browser-payroll-tools/` (6 tracked files)

- [ ] **Step 1:** Run `grep -rn "EmployeeForm\|components/Navbar" frontend/src`. Expected: no imports. If any exist, stop and report.
- [ ] **Step 2:** Rewrite `.gitignore` as one deduplicated file (keep every distinct rule; drop the stray `git rm -r --cached ...` line; keep `frontend/.browser-payroll-tools/`).
- [ ] **Step 3:** `git rm -r --cached frontend/.browser-payroll-tools` and delete the three files above from disk.
- [ ] **Step 4:** Run `npm run build` in `frontend/`. Expected: success.
- [ ] **Step 5:** Commit `chore: clean up gitignore, empty components, stray tooling`.

### Task 4: Cold-start "waking up" state

**Files:**
- Modify: `frontend/src/api/client.js`, `frontend/src/layouts/DashboardLayout.jsx`
- Create: `frontend/src/components/WakingBanner.jsx`

**Interfaces:**
- Consumes: `api` from Task 1.
- Produces: `client.js` additionally exports `onWaking(callback: (isWaking: boolean) => void): () => void` (subscribe, returns unsubscribe). A request pending longer than 3 seconds, or a 502/503/504/network error, sets waking `true`; the next successful response sets it `false`. `WakingBanner` renders text "Waking up the demo server — this can take up to a minute on the free tier." while waking.

- [ ] **Step 1:** Implement the interceptors and `onWaking` in `client.js` (axios request interceptor starts a 3s timer, response/error interceptors clear it and update state).
- [ ] **Step 2:** Implement `WakingBanner` and render it at the top of `DashboardLayout`; also raise the client timeout to 60000 so a cold start isn't aborted at 15s.
- [ ] **Step 3:** Manual check: stop the backend, load the app; the banner appears within ~3s; start the backend; the banner disappears after the next request.
- [ ] **Step 4:** Commit `feat(frontend): cold-start waking banner`.

---

## Stage 2 — Security and demo mode

### Task 5: User model, password hashing, token issuing, login and demo endpoints

**Files:**
- Create: `backend/models/User.js`, `backend/utils/tokens.js`, `backend/controllers/authController.js`, `backend/routes/authRoutes.js`, `backend/tests/tokens.test.js`, `backend/tests/auth.test.js`
- Modify: `backend/server.js` (mount `/api/auth` before the database-ready gate's routes but after it, so auth needs the DB), `backend/package.json` (deps)

**Interfaces:**
- Produces: `User` model: `{ email: String (unique, lowercase), passwordHash: String, role: "admin"|"viewer", isDemo: Boolean }`.
- Produces in `tokens.js`: `signToken(user: {id: string, role: string}, expiresIn?: string = "2h"): string` and `verifyToken(token: string): {id: string, role: string}` (throws on invalid/expired). Secret from `process.env.JWT_SECRET`; both throw if it is unset.
- Produces routes: `POST /api/auth/login` `{email, password}` → `{token, user:{email, role}}` (401 on bad credentials, same message for unknown email and wrong password); `POST /api/auth/demo` → admin token for the user flagged `isDemo` (404 if `DEMO_MODE !== "true"`); `GET /api/auth/me` (protected in Task 6) → `{email, role}`.

- [ ] **Step 1:** Write `tokens.test.js`: sign/verify round-trip returns id and role; tampered token throws; expired token (`expiresIn: "-1s"`) throws; missing `JWT_SECRET` throws.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Install `jsonwebtoken` and `bcryptjs`; implement `tokens.js`.
- [ ] **Step 4:** Implement `User`, `authController` (`login`, `demoLogin`, `me`), `authRoutes`, and mount in `server.js`. Write `auth.test.js` covering the controller functions with a stubbed `User` lookup: wrong password and unknown email return identical 401 bodies; `demoLogin` returns 404 when `DEMO_MODE` is not `"true"`.
- [ ] **Step 5:** Run `npm test`. Expected: PASS.
- [ ] **Step 6:** Commit `feat(auth): user model, tokens, login and demo endpoints`.

### Task 6: Auth and role middleware; protect all routes

**Files:**
- Create: `backend/middleware/auth.js`, `backend/tests/authMiddleware.test.js`
- Modify: `backend/server.js` (apply to employee, attendance, payroll routers and `/api/auth/me`)

**Interfaces:**
- Consumes: `verifyToken` from Task 5.
- Produces: `requireAuth(req, res, next)` — reads `Authorization: Bearer <token>`, sets `req.user = {id, role}`, otherwise responds 401 `{success:false, message}`. `requireWrite(req, res, next)` — responds 403 when `req.user.role !== "admin"`. In `server.js`, `requireAuth` guards every `/api` route except `/api/health`, `/api/auth/login`, `/api/auth/demo`; `requireWrite` is applied to every non-GET method on employee, attendance and payroll routers.

- [ ] **Step 1:** Write `authMiddleware.test.js` using plain mock `req/res`: no header → 401; malformed header → 401; tampered → 401; expired → 401; valid admin → `next()` called and `req.user.role === "admin"`; viewer on `requireWrite` → 403 and `next` not called; admin on `requireWrite` → `next()`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `auth.js` and apply it in `server.js` per the Interfaces block.
- [ ] **Step 4:** Run `npm test`. Expected: PASS. Then with the server running, `curl /api/employees` without a token returns 401 and `curl /api/health` still returns 200.
- [ ] **Step 5:** Commit `feat(auth): protect all API routes, block viewer writes`.

### Task 7: Input validation, rate limiting, security headers

**Files:**
- Create: `backend/middleware/validate.js`, `backend/middleware/rateLimits.js`, `backend/validation/schemas.js`, `backend/tests/validate.test.js`
- Modify: `backend/server.js`, routes files for employee, attendance and payroll write endpoints

**Interfaces:**
- Produces: `validate(schema: ZodSchema, source?: "body"|"query"|"params" = "body")` Express middleware: on failure responds 400 `{success:false, message:"Validation failed", errors:[{path, message}]}`, on success replaces `req[source]` with the parsed value. `schemas.js` exports `employeeCreate`, `employeeUpdate`, `payrollGenerate`, `payrollGenerateAll`, `payrollRecalculate`, `payrollListQuery` (the last is defined in Task 11 and may be a placeholder here). `rateLimits.js` exports `writeLimiter` (60 write requests/minute/IP on non-GET) and `demoLoginLimiter` (10/minute/IP). `helmet()` is added to `server.js`.

- [ ] **Step 1:** Write `validate.test.js`: valid payload passes and is coerced; missing required employee field → 400 with the field path; negative `basicSalary`, `allowance`, `deduction` → 400; non-numeric salary → 400.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Install `zod`, `helmet`, `express-rate-limit`; implement the files; attach `validate(...)` to the employee create/update and payroll POST/PUT routes, `writeLimiter` to write routes, `demoLoginLimiter` to `/api/auth/demo`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(api): validation, rate limits, helmet`.

### Task 8: Frontend login page, route guard, token handling

**Files:**
- Create: `frontend/src/pages/Login.jsx`, `frontend/src/auth/AuthContext.jsx`, `frontend/src/auth/RequireAuth.jsx`
- Modify: `frontend/src/App.jsx`, `frontend/src/main.jsx`, `frontend/src/api/client.js`, `frontend/src/components/Sidebar.jsx` (logout button)

**Interfaces:**
- Consumes: `api` from Task 1/4; routes from Task 5.
- Produces: `useAuth(): {user: {email, role} | null, login(email, password): Promise<void>, demoLogin(): Promise<void>, logout(): void}`. Token is stored in `localStorage` key `crm_token` (wrapped in try/catch). `client.js` adds an `Authorization` header from that key and, on any 401 response, clears the token and redirects to `/login`. `RequireAuth` wraps the existing `DashboardLayout` route; `/login` is public. The Login page shows a prominent "Try the demo" button above an email/password form.

- [ ] **Step 1:** Implement `AuthContext`, `RequireAuth`, `Login`, and wire routes in `App.jsx`.
- [ ] **Step 2:** Add the header and 401 handling to `client.js`; add a logout control to the sidebar.
- [ ] **Step 3:** Manual check: unauthenticated visit to `/employees` lands on `/login`; "Try the demo" lands on the dashboard with data; logout returns to `/login`; deleting `crm_token` in dev tools and clicking any action returns to `/login`.
- [ ] **Step 4:** Run `npm run build` and `npm run lint`. Expected: success.
- [ ] **Step 5:** Commit `feat(frontend): login page, demo button, route guard`.

### Task 9: Demo seed and guarded reset

**Files:**
- Create: `backend/scripts/seed.js`, `backend/scripts/seedData.js`, `backend/tests/seed.test.js`
- Modify: `backend/package.json` (script `"seed": "node scripts/seed.js"`), `render.yaml` (cron job running `npm run seed` daily at 03:00 UTC)

**Interfaces:**
- Produces: `assertSafeToReset(env: NodeJS.ProcessEnv): void` exported from `seed.js` — throws unless `env.DEMO_MODE === "true"` and `env.MONGODB_URI` is non-empty. `buildSeedData(today: Date): {employees, attendance, payroll}` in `seedData.js` — pure, deterministic for a given `today`, following the seed constraints in Global Constraints. Running `seed.js` as a script calls `assertSafeToReset`, connects, deletes `employees`, `attendances`, `payrolls`, and `users`, inserts fresh data plus the demo admin user (`isDemo: true`) and one non-demo `viewer` user whose password comes from `SEED_VIEWER_PASSWORD` if set, then exits 0; any failure exits non-zero.

- [ ] **Step 1:** Write `seed.test.js`: `assertSafeToReset({})` throws; throws when `DEMO_MODE="false"`; throws when `MONGODB_URI` empty; passes with both set. `buildSeedData` returns 12 employees with unique `employeeId` and `email`, only weekday attendance dates, payroll only for the two months before `today`, and at least one `Paid` and one `Pending` record.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `seedData.js`, then `seed.js` per the Interfaces block. Payroll rows must be produced with the payroll calculator from Task 10 once it exists; until then derive them by calling the existing controller helpers, and Task 10 switches the import.
- [ ] **Step 4:** Run `npm test`. Expected: PASS. Run `npm run seed` without `DEMO_MODE` and confirm it exits non-zero and the DB is untouched.
- [ ] **Step 5:** Commit `feat(demo): guarded seed and daily reset job`.

---

## Stage 3 — Payroll and attendance fixes, tests, refactor

### Task 10: Extract payroll maths into pure functions with characterization tests

**Files:**
- Create: `backend/services/payrollCalculator.js`, `backend/tests/payrollCalculator.test.js`
- Modify: `backend/controllers/payrollController.js` (remove the in-file helpers, import from the service)

**Interfaces:**
- Produces in `payrollCalculator.js` (all pure, no DB):
  - `isValidMonth(month: string): boolean`
  - `getScheduledWorkingDates(month: string): string[]` (Mon–Fri `YYYY-MM-DD`)
  - `getEvaluationDates(month: string, scheduled: string[], attendanceDates: Set<string>, today: string): string[]` (note `today` is now an explicit parameter)
  - `resolveFinalStatus(record): "Present"|"Late"|"Half Day"|null` (threshold 240 working minutes)
  - `summarizeAttendance({month, records, today}): {workingDays, elapsedWorkingDays, presentDays, lateDays, halfDays, absentDays}`
  - `calculatePayroll({employee, summary, otherDeduction}): {perDaySalary, grossSalary, attendanceDeduction, employeeDeduction, otherDeduction, totalDeduction, netSalary, basicSalary, allowance}` rounded to 2 decimals.
- Existing DB-reading helper `calculateAttendanceSummary(employeeId, month)` stays in the controller and now calls `summarizeAttendance`.

- [ ] **Step 1:** Write characterization tests against the current formulas, using exact numbers: September 2026 has 22 weekdays; gross 33000 → per-day 1500; 2 absent + 1 half day → attendance deduction 3750; deductions larger than gross cap `totalDeduction` at gross and `netSalary` at 0; future month → zero absences; past month with no records → absent equals working days (capped at gross); current month counts only days before `today`, and counts `today` only when a record exists; `resolveFinalStatus` returns Half Day at 239 minutes, Late when `lateMinutes > 0` at 240+, Present otherwise, and null without `checkOut`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL (module missing).
- [ ] **Step 3:** Move the helper logic out of the controller into the service without changing behavior; add the explicit `today` parameter; guard `workingDays === 0` (per-day 0) and non-finite inputs (treated as 0) so results are never NaN or negative.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Confirm `seed.js` (Task 9) now uses `calculatePayroll`/`summarizeAttendance` for payroll rows.
- [ ] **Step 6:** Commit `refactor(payroll): extract pure calculator with tests`.

### Task 11: Validate payroll inputs

**Files:**
- Modify: `backend/validation/schemas.js`, `backend/routes/payrollRoutes.js`, `backend/controllers/payrollController.js` (`getPayrolls`)
- Test: `backend/tests/payrollValidation.test.js`

**Interfaces:**
- Consumes: `validate` from Task 7, `isValidMonth` from Task 10.
- Produces: `payrollListQuery` schema: optional `month` matching `YYYY-MM` with month 01–12; optional `paymentStatus` in `["Pending","Paid"]`. `payrollGenerate`, `payrollGenerateAll`, `payrollRecalculate` reject `otherDeduction < 0` and non-numeric values. Valid-but-unexpected values are never silently ignored.

- [ ] **Step 1:** Write tests asserting 400 for `month` of `2026-13`, `abc`, `2026-1`, `paymentStatus` of `Refunded`, and `otherDeduction` of `-5` or `"abc"`; and success for `2026-09`, `Paid`, `0`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Complete the schemas and attach `validate(payrollListQuery, "query")` to the list route.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `fix(payroll): validate month, status, and deductions`.

### Task 12: Remove N+1 queries in bulk payroll

**Files:**
- Modify: `backend/controllers/payrollController.js` (`generateAllPayrolls`, `calculateAttendanceSummary` callers)
- Test: `backend/tests/bulkPayroll.test.js`

**Interfaces:**
- Consumes: `summarizeAttendance`, `calculatePayroll` from Task 10.
- Produces: `generateAllPayrolls` performs a fixed number of queries regardless of employee count: one query for active employees, one for existing payrolls of the month (`employee` in ids), one for all attendance in the month (`employee` in ids, regex on `date`), then groups attendance by employee in memory and writes new payrolls with `Payroll.insertMany`. The response shape (`summary`, `createdPayrolls`, `skippedEmployees`, `failedEmployees`) is unchanged; created payrolls are returned populated with the existing employee field list.

- [ ] **Step 1:** Write a test with a stubbed set of models counting calls: with 25 employees, `Attendance.find` is called once and `Payroll.findOne` zero times; employees with an existing payroll appear in `skippedEmployees`; output totals equal the pre-refactor numbers for the same fixtures.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the batched version per the Interfaces block.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit `perf(payroll): batch bulk generation queries`.

### Task 13: Split backend controllers

**Files:**
- Create: `backend/constants/populateFields.js`, `backend/services/attendanceCalculator.js`, `backend/services/payrollService.js`
- Modify: `backend/controllers/attendanceController.js`, `backend/controllers/payrollController.js`

**Interfaces:**
- Produces: `EMPLOYEE_POPULATE_FIELDS` (the string `"employeeId name email department designation basicSalary allowance deduction"`) used by every `.populate("employee", ...)` call in the backend (16 occurrences today). Attendance time/late/working-minute helpers move to `attendanceCalculator.js` as pure functions; DB-orchestrating payroll logic (generate, recalculate, mark paid) moves to `payrollService.js`, leaving controllers as thin request/response adapters. No exported route-handler name changes.

- [ ] **Step 1:** Run `npm test` to confirm the Task 10–12 suite is green before moving code.
- [ ] **Step 2:** Replace all populate field strings with the constant (`grep -rn "populate" backend/controllers` shows no inline field strings afterward).
- [ ] **Step 3:** Move helpers per the Interfaces block; keep each resulting file under about 500 lines.
- [ ] **Step 4:** Run `npm test`. Expected: PASS with no test edits. Then run the app and spot-check check-in, check-out, and payroll generate/recalculate/pay through the UI.
- [ ] **Step 5:** Commit `refactor(backend): split controllers, share populate fields`.

### Task 14: Split oversized frontend pages

**Files:**
- Modify: `frontend/src/pages/Attendance.jsx` (2,337 lines), `Payroll.jsx` (1,639), `Employees.jsx` (1,053)
- Create: `frontend/src/features/attendance/`, `frontend/src/features/payroll/`, `frontend/src/features/employees/` (components, hooks, and a `utils.js` per feature)

**Interfaces:**
- Produces: each page file becomes a composition of feature components and hooks and stays under about 400 lines; routes and visible behavior are unchanged. The payslip view and its print/PDF behavior in `Payroll.jsx` move to `features/payroll/Payslip.jsx` unchanged.

- [ ] **Step 1:** Run `npm run build` and `npm run lint` to record the baseline.
- [ ] **Step 2:** Extract per page in this order: Employees, Payroll, Attendance. Extract by moving code, not rewriting it (pure helpers to `utils.js`, data-fetching to hooks, JSX sections to components).
- [ ] **Step 3:** After each page: `npm run build` and `npm run lint` succeed, and the page is exercised manually (employees add/edit/delete; payroll generate, recalculate, pay, open and print payslip; attendance check-in through check-out, monthly view).
- [ ] **Step 4:** Commit once per page, `refactor(frontend): split <Page> page`.

### Task 15: README, screenshots, deploy guide

**Files:**
- Modify: `README.md`
- Create: `docs/DEPLOY.md`, `docs/screenshots/` (dashboard, employees, attendance, payroll, payslip, login)

- [ ] **Step 1:** Rewrite `README.md`: live demo link and "Try the demo" instruction, screenshots, architecture diagram (Vercel → Render → Atlas, with the daily reset job), payroll formula section kept accurate against `payrollCalculator.js`, API table updated with auth endpoints, a note about the free-tier cold start and the "waking up" banner, and a note that data resets daily.
- [ ] **Step 2:** Write `docs/DEPLOY.md`: Atlas cluster and user creation; network access; Render blueprint setup and the env vars to set (`MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `DEMO_MODE=true`); Vercel env `VITE_API_URL`; running the first seed; verifying with `/api/health`; optional keep-alive pinger.
- [ ] **Step 3:** Capture and commit the screenshots from the deployed (or locally seeded) app.
- [ ] **Step 4:** Commit `docs: showcase README and deploy guide`.

---

## Self-Review

- **Spec coverage:** deployment on Render/Atlas/Vercel (T2, T15); one-click demo login (T5, T8); real JWT underneath with roles (T5, T6); demo data, seed, daily reset, DEMO_MODE guard (T9); rate limiting (T7); gaps — API URL (T1), CORS (T2), `.gitignore`/backup/empty components/untrack tools/README structure (T3), cold-start UI (T4), payroll query validation and negative deductions (T11), N+1 (T12), payroll tests (T10), controller and page splits (T13, T14), README with screenshots and notes (T15). Out of scope per spec: holidays/leave, self-service, email.
- **Type consistency:** `verifyToken`/`signToken` (T5) used by `requireAuth` (T6); `validate` (T7) used in T11; `calculatePayroll`/`summarizeAttendance` (T10) used in T9 (switched at T10 step 5) and T12; `EMPLOYEE_POPULATE_FIELDS` (T13) matches the existing string.
- **Proportion:** tasks give signatures, test names with exact values, and commands; implementation bodies are left to the builder.
- **Ordering note:** T9 depends softly on T10; T10 step 5 closes that loop.
