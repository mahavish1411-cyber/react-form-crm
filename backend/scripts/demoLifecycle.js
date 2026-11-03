// In-process demo lifecycle (Render's free tier has no cron jobs):
//  - seeds once if no demo user exists
//  - resets the demo data daily at RESET_HOUR_UTC, and on wake-up if older than 24h
//    (a sleeping free-tier service misses the scheduled run)
const RESET_HOUR_UTC = 3;

function msUntilNextReset(now = new Date(), hour = RESET_HOUR_UTC) {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0, 0)
  );
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

// Non-destructive: makes sure a demo login user exists on an existing database.
// Never deletes or modifies any other data.
async function ensureDemoUser({ User, env = process.env } = {}) {
  const crypto = require("node:crypto");
  const bcrypt = require("bcryptjs");
  const role = env.DEMO_ROLE === "viewer" ? "viewer" : "admin";

  const existing = await User.findOne({ isDemo: true });
  if (existing) {
    if (existing.role !== role) {
      existing.role = role;
      await existing.save();
    }
    return existing;
  }
  return User.create({
    email: "demo@democrm.dev",
    passwordHash: await bcrypt.hash(crypto.randomBytes(18).toString("base64url"), 10),
    role,
    isDemo: true,
  });
}

let started = false;

function startDemoLifecycle(env = process.env) {
  if (started) return false;

  // Existing-data mode: demo login only, no seeding, no resets.
  if (env.DEMO_MODE !== "true") {
    if (env.DEMO_LOGIN !== "true") return false;
    started = true;
    ensureDemoUser({ User: require("../models/User"), env }).then(
      () => console.log("Demo login enabled on existing data (no seeding, no resets)."),
      (error) => console.error("Demo user setup failed:", error.message)
    );
    return true;
  }
  started = true;

  const { seedDatabase } = require("./seed");
  const User = require("../models/User");

  const reseed = async (reason) => {
    try {
      const r = await seedDatabase();
      console.log(`Demo data ${reason}: ${r.employees} employees, ${r.attendance} attendance, ${r.payroll} payroll.`);
    } catch (error) {
      console.error(`Demo ${reason} failed:`, error.message);
    }
  };

  const schedule = () => {
    const timer = setTimeout(async () => {
      await reseed("reset");
      schedule();
    }, msUntilNextReset());
    timer.unref?.();
  };

  (async () => {
    try {
      const hasDemoUser = await User.findOne({ isDemo: true });
      const stale =
        hasDemoUser && Date.now() - new Date(hasDemoUser.createdAt).getTime() > 24 * 3600 * 1000;
      if (!hasDemoUser) await reseed("seeded");
      else if (stale) await reseed("reset (stale on wake-up)");
    } catch (error) {
      console.error("Demo bootstrap failed:", error.message);
    }
    schedule();
  })();

  return true;
}

module.exports = { startDemoLifecycle, ensureDemoUser, msUntilNextReset, RESET_HOUR_UTC };
