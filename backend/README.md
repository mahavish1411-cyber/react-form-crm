# CRM backend

Run `npm run dev` from this directory. Environment variables are loaded from
`backend/.env`, even when the server is launched from another directory.

Required configuration:

```dotenv
PORT=5000
MONGODB_URI=your-current-mongodb-connection-string
```

The HTTP server starts while MongoDB connects. `GET /api/health` returns 200
when the database is ready, or 503 with a diagnostic code otherwise. Data
endpoints return 503 while disconnected. Connections retry automatically;
nodemon also restarts when `.env` changes.

If `DATABASE_DNS_ERROR` appears, verify that the Atlas cluster is active and
copy its current connection string from Atlas Connect → Drivers into `.env`.
The configured shard hostnames may be unavailable or outdated. Keep database
credentials private. Authentication failures and other network failures have
separate diagnostic codes; a generic Atlas timeout is not proof of an IP
access-list problem.

Local MongoDB can be configured explicitly using
`mongodb://127.0.0.1:27017/artic9_crm`. This is a separate database and will
not contain Atlas records. The application never switches databases automatically.

Run connection failure checks with `node --test tests/connection.test.js`.
