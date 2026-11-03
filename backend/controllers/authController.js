const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken } = require("../utils/tokens");

const INVALID = { success: false, message: "Invalid email or password" };

const publicUser = (user) => ({ email: user.email, role: user.role });

const login = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = email ? await User.findOne({ email }) : null;
    const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!ok) return res.status(401).json(INVALID);

    return res.status(200).json({
      success: true,
      token: signToken({ id: user._id, role: user.role }),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to sign in" });
  }
};

const demoLogin = async (req, res) => {
  try {
    if (process.env.DEMO_MODE !== "true") {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    const user = await User.findOne({ isDemo: true });
    if (!user) {
      return res.status(503).json({
        success: false,
        message: "Demo data is being prepared. Please retry shortly.",
      });
    }
    return res.status(200).json({
      success: true,
      token: signToken({ id: user._id, role: user.role }, "2h"),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Demo login error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to start demo" });
  }
};

const me = (req, res) =>
  res.status(200).json({ success: true, user: { id: req.user.id, role: req.user.role } });

module.exports = { login, demoLogin, me };
