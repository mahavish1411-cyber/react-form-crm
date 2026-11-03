const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const { buildCorsOptions } = require("./utils/corsOptions");
const connectDB = require("./config/db");
const { describeDatabaseError } = connectDB;

const employeeRoutes = require("./routes/employeeRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const authRoutes = require("./routes/authRoutes");
const helmet = require("helmet");
const { requireAuth, requireWrite } = require("./middleware/auth");
const { writeLimiter } = require("./middleware/rateLimits");

const app = express();
let databaseError = { code: 'DATABASE_CONNECTING', message: 'Database connection is starting. Please retry shortly.' };
let connecting = false;
let retryTimer;
let retryCount = 0;

function databaseStatus(req, res) {
  const ready = mongoose.connection.readyState === 1;
  return res.status(ready ? 200 : 503).json({ success: ready, database: ready ? 'connected' : 'unavailable', ...(ready ? {} : databaseError) });
}

function scheduleReconnect() {
  if (retryTimer || connecting) return;
  const delay = Math.min(5000 * (2 ** Math.min(retryCount++, 3)), 30000);
  console.log(`Retrying MongoDB connection in ${delay / 1000}s.`);
  retryTimer = setTimeout(() => { retryTimer = undefined; connectDatabase(); }, delay);
}

async function connectDatabase() {
  if (connecting || mongoose.connection.readyState === 1) return;
  connecting = true;
  try {
    await connectDB();
    databaseError = null;
    retryCount = 0;
    console.log('MongoDB connected. CRM API is ready.');
  } catch (error) {
    databaseError = describeDatabaseError(error);
    console.error(`${databaseError.code}: ${databaseError.message}`);
  } finally {
    connecting = false;
    if (mongoose.connection.readyState !== 1) scheduleReconnect();
  }
}

mongoose.connection.on('disconnected', () => {
  databaseError = databaseError || { code: 'DATABASE_UNAVAILABLE', message: 'Database connection was interrupted. Reconnecting; please retry shortly.' };
  scheduleReconnect();
});

// ==========================================
// MIDDLEWARE
// ==========================================

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors(buildCorsOptions(process.env.CORS_ORIGINS)));

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ==========================================
// ROUTES
// ==========================================

// Employee Routes
app.get('/api/health', databaseStatus);
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    res.set('Retry-After', '5');
    return res.status(503).json({ success: false, ...(databaseError || { code: 'DATABASE_UNAVAILABLE', message: 'Database is reconnecting. Please retry shortly.' }) });
  }
  next();
});

// Auth (public: /login, /demo)
app.use("/api/auth", authRoutes);

// Everything below requires a valid token; non-admins are read-only.
app.use("/api", requireAuth, requireWrite, writeLimiter);

app.use(
  "/api",
  employeeRoutes
);

// Attendance Routes
app.use(
  "/api/attendance",
  attendanceRoutes
);

// Payroll Routes
app.use(
  "/api/payroll",
  payrollRoutes
);

// ==========================================
// TEST ROUTE
// ==========================================

app.get("/", databaseStatus);

// ==========================================
// PORT
// ==========================================

const PORT =
  process.env.PORT || 5000;

// ==========================================
// START SERVER
// ==========================================

const startServer = () => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}; connecting to MongoDB...`);
    connectDatabase();
  });
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${PORT} is already in use. Stop the other backend process or change PORT in backend/.env.` : 'Unable to start the HTTP server.');
    process.exit(1);
  });
};

startServer();
