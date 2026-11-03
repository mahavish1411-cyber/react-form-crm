const rateLimit = require("express-rate-limit");

const message = { success: false, message: "Too many requests. Please slow down." };

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message,
  skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method),
});

const demoLoginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

module.exports = { writeLimiter, demoLoginLimiter };
