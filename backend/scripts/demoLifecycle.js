// In-process demo lifecycle (Render's free tier has no cron jobs):
//  - seeds once if no demo user exists
//  - resets the demo data daily at RESET_HOUR_UTC
const RESET_HOUR_UTC = 3;

function msUntilNextReset(now = new Date(), hour = RESET_HOUR_UTC) {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0, 0)
  );
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

let started = false;

function startDemoLifecycle(env = process.env) {
  if (env.DEMO_MODE !== "true" || started) return false;
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
      if (!hasDemoUser) await reseed("seeded");
    } catch (error) {
      console.error("Demo bootstrap failed:", error.message);
    }
    schedule();
  })();

  return true;
}

module.exports = { startDemoLifecycle, msUntilNextReset, RESET_HOUR_UTC };
