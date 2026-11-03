// Pure, deterministic demo-data builder. No database access.
const { summarizeAttendance, calculatePayroll, getDateString } = require("../services/payrollCalculator");

const PEOPLE = [
  ["Aarav Mehta", "Engineering", "Senior Software Engineer", 78000, 8000, 1500],
  ["Priya Nair", "Engineering", "Frontend Developer", 62000, 6000, 1000],
  ["Rohan Iyer", "Engineering", "Backend Developer", 66000, 6500, 1000],
  ["Sneha Kapoor", "Engineering", "QA Engineer", 52000, 5000, 800],
  ["Vikram Rao", "Sales", "Sales Manager", 70000, 9000, 1500],
  ["Ananya Das", "Sales", "Account Executive", 48000, 5000, 600],
  ["Karan Malhotra", "Sales", "Sales Associate", 38000, 4000, 500],
  ["Meera Pillai", "Human Resources", "HR Manager", 64000, 6000, 1200],
  ["Arjun Reddy", "Human Resources", "Recruiter", 42000, 4000, 500],
  ["Divya Sharma", "Finance", "Finance Analyst", 56000, 5500, 900],
  ["Rahul Verma", "Finance", "Accountant", 46000, 4500, 700],
  ["Ishita Bose", "Marketing", "Marketing Lead", 60000, 6000, 1000],
];

// Small deterministic PRNG (mulberry32) so a given date always yields the same data.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const monthKey = (year, monthIndex) => `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

function buildSeedData(today = new Date()) {
  const todayStr = getDateString(today);
  const random = rng(20260101);

  const employees = PEOPLE.map(([name, department, designation, basicSalary, allowance, deduction], i) => ({
    employeeId: `EMP${String(i + 1).padStart(3, "0")}`,
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@democrm.dev`,
    phone: `+91 90000 ${String(10000 + i * 137).slice(-5)}`,
    department,
    designation,
    basicSalary,
    allowance,
    deduction,
    status: "Active",
  }));

  // Months: two previous + current (up to yesterday).
  const prev2 = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const prev1 = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const cur = new Date(today.getFullYear(), today.getMonth(), 1);
  const months = [prev2, prev1, cur].map((d) => ({
    key: monthKey(d.getFullYear(), d.getMonth()),
    year: d.getFullYear(),
    monthIndex: d.getMonth(),
  }));

  const attendance = [];
  for (const employee of employees) {
    for (const m of months) {
      const lastDay = new Date(m.year, m.monthIndex + 1, 0).getDate();
      for (let day = 1; day <= lastDay; day += 1) {
        const date = new Date(m.year, m.monthIndex, day);
        const dow = date.getDay();
        if (dow === 0 || dow === 6) continue;
        const dateStr = getDateString(date);
        if (dateStr >= todayStr) continue;

        const roll = random();
        if (roll < 0.06) continue; // absent: no record

        let lateMinutes = 0;
        let workingMinutes = 480;
        let finalStatus = "Present";
        if (roll < 0.06 + 0.05) {
          workingMinutes = 180 + Math.floor(random() * 50);
          finalStatus = "Half Day";
        } else if (roll < 0.06 + 0.05 + 0.12) {
          lateMinutes = 10 + Math.floor(random() * 35);
          workingMinutes = 450;
          finalStatus = "Late";
        }

        const checkIn = new Date(m.year, m.monthIndex, day, 9, lateMinutes, 0);
        const breakStart = new Date(m.year, m.monthIndex, day, 13, 0, 0);
        const breakEnd = new Date(m.year, m.monthIndex, day, 14, 0, 0);
        const checkOut = new Date(checkIn.getTime() + (workingMinutes + 60) * 60000);

        attendance.push({
          employeeId: employee.employeeId,
          date: dateStr,
          checkIn,
          breaks: [{ start: breakStart, end: breakEnd }],
          checkOut,
          lateMinutes,
          earlyCheckoutMinutes: 0,
          workingMinutes,
          status: "Checked Out",
          finalStatus,
        });
      }
    }
  }

  const payroll = [];
  [months[0], months[1]].forEach((m, monthIdx) => {
    employees.forEach((employee, empIdx) => {
      const records = attendance.filter(
        (a) => a.employeeId === employee.employeeId && a.date.startsWith(`${m.key}-`)
      );
      const summary = summarizeAttendance({ month: m.key, records, today: todayStr });
      const values = calculatePayroll({ employee, summary, otherDeduction: 0 });
      // Older month fully paid; most recent month half paid / half pending.
      const paid = monthIdx === 0 || empIdx % 2 === 0;
      payroll.push({
        employeeId: employee.employeeId,
        month: m.key,
        workingDays: summary.workingDays,
        presentDays: summary.presentDays,
        lateDays: summary.lateDays,
        halfDays: summary.halfDays,
        absentDays: summary.absentDays,
        ...values,
        paymentStatus: paid ? "Paid" : "Pending",
        paidDate: paid ? new Date(m.year, m.monthIndex + 1, 5, 12, 0, 0) : null,
        remarks: `${m.key} Payroll`,
      });
    });
  });

  return { employees, attendance, payroll };
}

module.exports = { buildSeedData };
