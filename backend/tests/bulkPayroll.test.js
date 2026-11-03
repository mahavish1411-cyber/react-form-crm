const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Employee = require('../models/Employee');
const Payroll = require('../models/Payroll');
const Attendance = require('../models/Attendance');
const { generateAllPayrolls } = require('../controllers/payrollController');

// A thenable "query" that also supports .populate()
const query = (value) => ({
  populate: () => query(value),
  select: () => query(value),
  sort: () => query(value),
  then: (res, rej) => Promise.resolve(value).then(res, rej),
});

function mockRes() {
  const res = { statusCode: 200 };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

let calls;
let inserted;

beforeEach(() => {
  calls = { attendanceFind: 0, payrollFindOne: 0, payrollFind: 0, insertMany: 0 };
  inserted = [];
});

function stub({ employees, existing = [] }) {
  Employee.find = () => query(employees);
  Attendance.find = () => { calls.attendanceFind += 1; return query([]); };
  Payroll.findOne = () => { calls.payrollFindOne += 1; return query(null); };
  Payroll.find = (q) => {
    calls.payrollFind += 1;
    // first call: existing payrolls for the month; later: created docs
    if (calls.payrollFind === 1) return query(existing);
    return query(inserted);
  };
  Payroll.insertMany = async (docs) => {
    calls.insertMany += 1;
    inserted = docs.map((d, i) => ({ ...d, _id: `p${i}` }));
    return inserted;
  };
}

test('bulk generation uses a fixed number of queries regardless of employee count', async () => {
  const employees = Array.from({ length: 25 }, (_, i) => ({
    _id: `e${i}`, employeeId: `E${i}`, name: `N${i}`, basicSalary: 30000, allowance: 3000, deduction: 0,
  }));
  stub({ employees });
  const res = mockRes();
  await generateAllPayrolls({ body: { month: '2026-09' } }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(calls.attendanceFind, 1);
  assert.equal(calls.payrollFindOne, 0);
  assert.equal(calls.insertMany, 1);
  assert.equal(res.body.summary.created, 25);
  assert.equal(res.body.summary.skipped, 0);
  // no attendance in a past month => everyone absent all 22 days => net 0
  assert.equal(inserted[0].workingDays, 22);
  assert.equal(inserted[0].absentDays, 22);
  assert.equal(inserted[0].netSalary, 0);
});

test('employees with an existing payroll are skipped', async () => {
  const employees = [
    { _id: 'e1', employeeId: 'E1', name: 'A', basicSalary: 1000, allowance: 0, deduction: 0 },
    { _id: 'e2', employeeId: 'E2', name: 'B', basicSalary: 1000, allowance: 0, deduction: 0 },
  ];
  stub({ employees, existing: [{ employee: 'e1' }] });
  const res = mockRes();
  await generateAllPayrolls({ body: { month: '2026-09' } }, res);

  assert.equal(res.body.summary.created, 1);
  assert.equal(res.body.summary.skipped, 1);
  assert.equal(res.body.skippedEmployees[0].employeeId, 'E1');
});
