# Deploying the demo

Stack: **MongoDB Atlas** (database) → **Render** (API) → **Vercel** (frontend). All free tiers.

## 1. MongoDB Atlas

1. Create a free **M0** cluster.
2. *Database Access* → add a user with a strong password (read/write on any database). URL-encode special characters in the password.
3. *Network Access* → allow `0.0.0.0/0` (Render free tier has no fixed IP; the demo holds only fake data).
4. *Connect → Drivers* → copy the connection string and add a database name, e.g.
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/crm_demo?retryWrites=true&w=majority`

> Use a **dedicated demo database**. The server wipes and re-seeds it daily when `DEMO_MODE=true`. Never point a demo deployment at real data.

## 2. Render (backend)

1. Push this repo to GitHub.
2. Render → *New → Blueprint* → pick the repo (it reads `render.yaml`), or *New → Web Service* with root directory `backend`, build `npm install`, start `npm start`, health check path `/api/health`.
3. Set environment variables:

| Key | Value |
|---|---|
| `MONGODB_URI` | the Atlas string from step 1 |
| `JWT_SECRET` | a long random string (e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `CORS_ORIGINS` | `https://YOUR-APP.vercel.app,https://*.vercel.app` (comma separated; `*` allowed for preview URLs) |
| `DEMO_MODE` | `true` |

4. Deploy. When the database connects, the server **seeds the demo data automatically** if no demo user exists, and resets it daily at 03:00 UTC (and on wake-up if the data is older than 24h).
5. Check `https://YOUR-SERVICE.onrender.com/api/health` → `{"success":true,"database":"connected"}`.

**Cold starts:** the free tier sleeps after ~15 minutes idle and takes up to a minute to wake. The frontend shows a "Waking up the demo server" banner. Optionally ping `/api/health` every 10 minutes with a free uptime monitor to keep it warm.

## 3. Vercel (frontend)

1. *New Project* → import the repo, **Root Directory** `frontend`, framework Vite (build `npm run build`, output `dist`).
2. Environment variable: `VITE_API_URL` = `https://YOUR-SERVICE.onrender.com/api`
3. Deploy, then put the final Vercel URL into Render's `CORS_ORIGINS` if you haven't already.
4. Single-page-app routing: add `frontend/vercel.json` rewrites (already included in this repo) so `/login`, `/payroll` etc. work on refresh.

## 4. Verify

1. Open the Vercel URL → login page → **Try the demo**.
2. Dashboard shows 12 employees; Payroll for the previous two months is already generated; the current month can be generated.
3. In another browser profile, `GET /api/employees` without a token returns `401`.

## Running a manual reset / local seed

```bash
cd backend
DEMO_MODE=true MONGODB_URI="<demo db uri>" npm run seed
```

The script refuses to run unless `DEMO_MODE` is exactly `true`.

## Local development

```bash
# backend/.env (see backend/.env.example)
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/crm_dev
JWT_SECRET=dev-secret
DEMO_MODE=true
CORS_ORIGINS=http://localhost:5173
```

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
npm test --prefix backend
```
