// Resets the DEMO database with fake data. Destructive: wipes employees,
// attendances, payrolls and users. Refuses to run unless DEMO_MODE=true.
const crypto = require("node:crypto");
const path = require("node:path");

function assertSafeToReset(env) {
  if (env.DEMO_MODE !== "true") {
    throw new Error("Refusing to seed: DEMO_MODE must be exactly 'true'.");
  }
  if (!env.MONGODB_URI) {
    throw new Error("Refusing to seed: MONGODB_URI is not set.");
  }
}

// Wipes and re-seeds using the CURRENT mongoose connection.
async function seedDatabase() {
  assertSafeToReset(process.env);

  const bcrypt = require("bcryptjs");
  const Employee = require("../models/Employee");
  const Attendance = require("../models/Attendance");
  const Payroll = require("../models/Payroll");
  const User = require("../models/User");
  const { buildSeedData } = require("./seedData");

  const { employees, attendance, payroll } = buildSeedData(new Date());

  await Promise.all([
    Employee.deleteMany({}),
    Attendance.deleteMany({}),
    Payroll.deleteMany({}),
    User.deleteMany({}),
  ]);

  const created = await Employee.insertMany(employees);
  const idByKey = new Map(created.map((e) => [e.employeeId, e._id]));

  await Attendance.insertMany(
    attendance.map(({ employeeId, ...rest }) => ({ ...rest, employee: idByKey.get(employeeId) }))
  );
  await Payroll.insertMany(
    payroll.map(({ employeeId, ...rest }) => ({ ...rest, employee: idByKey.get(employeeId) }))
  );

  const randomPassword = () => crypto.randomBytes(18).toString("base64url");
  await User.insertMany([
    {
      email: "demo@democrm.dev",
      passwordHash: await bcrypt.hash(randomPassword(), 10),
      role: "admin",
      isDemo: true,
    },
    {
      email: "viewer@democrm.dev",
      passwordHash: await bcrypt.hash(process.env.SEED_VIEWER_PASSWORD || randomPassword(), 10),
      role: "viewer",
      isDemo: false,
    },
  ]);

  return {
    employees: created.length,
    attendance: attendance.length,
    payroll: payroll.length,
  };
}

async function run() {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
  assertSafeToReset(process.env);

  const mongoose = require("mongoose");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    const r = await seedDatabase();
    console.log(
      `Seeded ${r.employees} employees, ${r.attendance} attendance records, ${r.payroll} payroll records.`
    );
  } finally {
    await mongoose.disconnect();
  }
}

module.exports = { assertSafeToReset, seedDatabase };

if (require.main === module) {
  run().then(
    () => process.exit(0),
    (error) => {
      console.error(error.message);
      process.exit(1);
    }
  );
}
