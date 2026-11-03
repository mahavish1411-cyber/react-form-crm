const { verifyToken } = require("../utils/tokens");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function requireAuth(req, res, next) {
  const header = req.headers?.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

// Blocks state-changing requests for non-admin roles.
function requireWrite(req, res, next) {
  if (SAFE_METHODS.has(req.method) || req.user?.role === "admin") return next();
  return res.status(403).json({ success: false, message: "Read-only account" });
}

module.exports = { requireAuth, requireWrite };
