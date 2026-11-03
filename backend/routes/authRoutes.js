const express = require("express");
const { login, demoLogin, me } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { demoLoginLimiter } = require("../middleware/rateLimits");

const router = express.Router();

router.post("/login", login);
router.post("/demo", demoLoginLimiter, demoLogin);
router.get("/me", requireAuth, me);

module.exports = router;
