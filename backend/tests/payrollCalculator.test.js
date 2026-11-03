const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidMonth,
  getScheduledWorkingDates,
  getEvaluationDates,
  resolveFinalStatus,
  summarizeAttendance,
  calculatePayroll,
} = require('../services/payrollCalculator');

const emp = (o = {}) => ({ basicSalary: 30000, allowance: 3000, deduction: 0, ...o });

test('isValidMonth', () => {
  assert.equal(isValidMonth('2026-09'), true);
  for (const m of ['2026-13', '2026-00', '2026-1', 'abc', '', undefined]) {
    assert.equal(isValidMonth(m), false, String(m));
  }
});

test('September 2026 has 22 Mon-Fri dates and no weekends', () => {
  const dates = getScheduledWorkingDates('2026-09');
  assert.equal(dates.length, 22);
  assert.equal(dates[0], '2026-09-01');
  assert.ok(!dates.includes('2026-09-05')); // Saturday
  assert.ok(!dates.includes('2026-09-06')); // Sunday
});

test('gross 33000 / 22 days = 1500 per day; 2 absent + 1 half day = 3750', () => {
  const r = calculatePayroll({
    employee: emp(),
    summary: { workingDays: 22, absentDays: 2, halfDays: 1 },
    otherDeduction: 0,
  });
  assert.equal(r.grossSalary, 33000);
  assert.equal(r.perDaySalary, 1500);
  assert.equal(r.attendanceDeduction, 3750);
  assert.equal(r.totalDeduction, 3750);
  assert.equal(r.netSalary, 29250);
});

test('employee and other deductions add on top of attendance deduction', () => {
  const r = calculatePayroll({
    employee: emp({ deduction: 500 }),
    summary: { workingDays: 22, absentDays: 1, halfDays: 0 },
    otherDeduction: 250,
  });
  assert.equal(r.totalDeduction, 1500 + 500 + 250);
  assert.equal(r.netSalary, 33000 - 2250);
});

test('deductions larger than gross cap totalDeduction at gross and net at 0', () => {
  const r = calculatePayroll({
    employee: emp({ deduction: 40000 }),
    summary: { workingDays: 22, absentDays: 22, halfDays: 0 },
    otherDeduction: 100,
  });
  assert.equal(r.attendanceDeduction, 33000);
  assert.equal(r.totalDeduction, 33000);
  assert.equal(r.netSalary, 0);
});

test('zero working days, zero gross, and bad numbers never give NaN or negatives', () => {
  const cases = [
    { employee: emp(), summary: { workingDays: 0, absentDays: 3, halfDays: 1 }, otherDeduction: 0 },
    { employee: emp({ basicSalary: 0, allowance: 0 }), summary: { workingDays: 22, absentDays: 2, halfDays: 0 }, otherDeduction: 0 },
    { employee: emp({ basicSalary: 'abc', allowance: undefined }), summary: { workingDays: 22, absentDays: 0, halfDays: 0 }, otherDeduction: 'x' },
  ];
  for (const c of cases) {
    const r = calculatePayroll(c);
    for (const [k, v] of Object.entries(r)) {
      assert.ok(Number.isFinite(v) && v >= 0, `${k}=${v}`);
    }
  }
});

test('future month has no evaluation dates (nobody absent)', () => {
  const scheduled = getScheduledWorkingDates('2026-12');
  assert.deepEqual(getEvaluationDates('2026-12', scheduled, new Set(), '2026-11-03'), []);
});

test('past month evaluates every scheduled date', () => {
  const scheduled = getScheduledWorkingDates('2026-09');
  assert.equal(getEvaluationDates('2026-09', scheduled, new Set(), '2026-11-03').length, 22);
});

test('current month counts days before today, and today only with a record', () => {
  const scheduled = getScheduledWorkingDates('2026-11');
  // 2026-11-03 is a Tuesday: Nov 2 (Mon) is the only weekday before it.
  assert.deepEqual(getEvaluationDates('2026-11', scheduled, new Set(), '2026-11-03'), ['2026-11-02']);
  assert.deepEqual(
    getEvaluationDates('2026-11', scheduled, new Set(['2026-11-03']), '2026-11-03'),
    ['2026-11-02', '2026-11-03']
  );
});

test('resolveFinalStatus thresholds', () => {
  const base = { checkIn: '2026-09-01T09:00:00Z' };
  assert.equal(resolveFinalStatus({ ...base }), null);
  assert.equal(resolveFinalStatus({ ...base, checkOut: 'x', workingMinutes: 239 }), 'Half Day');
  assert.equal(resolveFinalStatus({ ...base, checkOut: 'x', workingMinutes: 240, lateMinutes: 5 }), 'Late');
  assert.equal(resolveFinalStatus({ ...base, checkOut: 'x', workingMinutes: 480 }), 'Present');
});

test('summarizeAttendance over a past month: records classified, missing days absent', () => {
  const rec = (date, workingMinutes, lateMinutes = 0) => ({
    date, checkIn: `${date}T09:00:00Z`, checkOut: `${date}T18:00:00Z`, workingMinutes, lateMinutes,
  });
  const s = summarizeAttendance({
    month: '2026-09',
    today: '2026-11-03',
    records: [rec('2026-09-01', 480), rec('2026-09-02', 480, 10), rec('2026-09-03', 100)],
  });
  assert.equal(s.workingDays, 22);
  assert.equal(s.elapsedWorkingDays, 22);
  assert.equal(s.presentDays, 1);
  assert.equal(s.lateDays, 1);
  assert.equal(s.halfDays, 1);
  assert.equal(s.absentDays, 19);
});
