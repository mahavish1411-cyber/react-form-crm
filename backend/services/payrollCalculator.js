// Pure payroll / attendance-summary maths. No database access.

const HALF_DAY_MINUTES = 240;

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (value) => Number(num(value).toFixed(2));

const getDateString = (dateValue) => {
  const date = new Date(dateValue);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const isValidMonth = (month) => {
  if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) return false;
  const monthNumber = Number(month.slice(5, 7));
  return monthNumber >= 1 && monthNumber <= 12;
};

// All Monday-Friday dates (YYYY-MM-DD) in the month.
const getScheduledWorkingDates = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const dates = [];
  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, monthNumber - 1, day);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) dates.push(getDateString(date));
  }
  return dates;
};

// Past month: all scheduled dates. Future month: none.
// Current month: dates before today, plus today only if a record exists.
const getEvaluationDates = (month, scheduled, attendanceDates = new Set(), today) => {
  const currentMonth = today.slice(0, 7);
  if (month < currentMonth) return scheduled;
  if (month > currentMonth) return [];
  return scheduled.filter(
    (d) => d < today || (d === today && attendanceDates.has(today))
  );
};

const breakMinutes = (breaks = []) => {
  if (!Array.isArray(breaks)) return 0;
  let ms = 0;
  for (const b of breaks) {
    if (!b?.start || !b?.end) continue;
    const start = new Date(b.start).getTime();
    const end = new Date(b.end).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue;
    ms += end - start;
  }
  return Math.floor(ms / 60000);
};

const calculateWorkingMinutes = (record) => {
  if (!record?.checkIn || !record?.checkOut) return 0;
  const inMs = new Date(record.checkIn).getTime();
  const outMs = new Date(record.checkOut).getTime();
  if (Number.isNaN(inMs) || Number.isNaN(outMs) || outMs <= inMs) return 0;
  const total = Math.floor((outMs - inMs) / 60000);
  return Math.max(total - breakMinutes(record.breaks), 0);
};

const resolveFinalStatus = (record) => {
  if (!record?.checkOut) return null;
  let working = num(record.workingMinutes);
  if (working === 0) working = calculateWorkingMinutes(record); // older records
  if (working < HALF_DAY_MINUTES) return "Half Day";
  if (num(record.lateMinutes) > 0) return "Late";
  return "Present";
};

const summarizeAttendance = ({ month, records = [], today }) => {
  const byDate = new Map();
  for (const r of records) byDate.set(r.date, r);

  const scheduled = getScheduledWorkingDates(month);
  const evaluation = getEvaluationDates(month, scheduled, new Set(byDate.keys()), today);

  let presentDays = 0;
  let lateDays = 0;
  let halfDays = 0;
  let absentDays = 0;

  for (const date of evaluation) {
    const record = byDate.get(date);
    if (!record) {
      absentDays += 1;
      continue;
    }
    const status = resolveFinalStatus(record);
    if (status === "Half Day") halfDays += 1;
    else if (status === "Late") lateDays += 1;
    else if (status === "Present") presentDays += 1;
  }

  return {
    workingDays: scheduled.length,
    elapsedWorkingDays: evaluation.length,
    presentDays,
    lateDays,
    halfDays,
    absentDays,
  };
};

const calculatePayroll = ({ employee, summary, otherDeduction = 0 }) => {
  const basicSalary = num(employee?.basicSalary);
  const allowance = num(employee?.allowance);
  const employeeDeduction = num(employee?.deduction);
  const other = num(otherDeduction);

  const grossSalary = basicSalary + allowance;
  const workingDays = num(summary?.workingDays);
  const perDaySalary = workingDays > 0 ? grossSalary / workingDays : 0;

  const rawAttendance =
    perDaySalary * num(summary?.absentDays) +
    perDaySalary * 0.5 * num(summary?.halfDays);
  const attendanceDeduction = Math.min(rawAttendance, grossSalary);

  const totalDeduction = Math.min(
    attendanceDeduction + employeeDeduction + other,
    grossSalary
  );
  const netSalary = Math.max(grossSalary - totalDeduction, 0);

  return {
    basicSalary: round2(basicSalary),
    allowance: round2(allowance),
    grossSalary: round2(grossSalary),
    perDaySalary: round2(perDaySalary),
    attendanceDeduction: round2(attendanceDeduction),
    employeeDeduction: round2(employeeDeduction),
    otherDeduction: round2(other),
    totalDeduction: round2(totalDeduction),
    netSalary: round2(netSalary),
  };
};

module.exports = {
  HALF_DAY_MINUTES,
  getDateString,
  isValidMonth,
  getScheduledWorkingDates,
  getEvaluationDates,
  calculateWorkingMinutes,
  resolveFinalStatus,
  summarizeAttendance,
  calculatePayroll,
};
