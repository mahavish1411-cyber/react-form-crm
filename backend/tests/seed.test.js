const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertSafeToReset } = require('../scripts/seed');
const { buildSeedData } = require('../scripts/seedData');

test('assertSafeToReset refuses without DEMO_MODE=true or without MONGODB_URI', () => {
  assert.throws(() => assertSafeToReset({}));
  assert.throws(() => assertSafeToReset({ DEMO_MODE: 'false', MONGODB_URI: 'mongodb://x' }));
  assert.throws(() => assertSafeToReset({ DEMO_MODE: 'true', MONGODB_URI: '' }));
  assert.throws(() => assertSafeToReset({ DEMO_MODE: 'true' }));
  assert.doesNotThrow(() => assertSafeToReset({ DEMO_MODE: 'true', MONGODB_URI: 'mongodb://x' }));
});

const today = new Date(2026, 10, 3); // 3 Nov 2026
const data = buildSeedData(today);

test('12 employees, unique ids and emails, 4-5 departments', () => {
  assert.equal(data.employees.length, 12);
  assert.equal(new Set(data.employees.map((e) => e.employeeId)).size, 12);
  assert.equal(new Set(data.employees.map((e) => e.email)).size, 12);
  const depts = new Set(data.employees.map((e) => e.department)).size;
  assert.ok(depts >= 4 && depts <= 5, `departments=${depts}`);
});

test('attendance only on weekdays, never today or later', () => {
  assert.ok(data.attendance.length > 0);
  for (const a of data.attendance) {
    const [y, m, d] = a.date.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    assert.ok(dow !== 0 && dow !== 6, a.date);
    assert.ok(a.date < '2026-11-03', a.date);
  }
});

test('attendance mix includes present, late, half-day', () => {
  const finals = new Set(data.attendance.map((a) => a.finalStatus));
  for (const s of ['Present', 'Late', 'Half Day']) assert.ok(finals.has(s), s);
});

test('payroll only for the two previous months, with Paid and Pending', () => {
  const months = new Set(data.payroll.map((p) => p.month));
  assert.deepEqual([...months].sort(), ['2026-09', '2026-10']);
  const statuses = new Set(data.payroll.map((p) => p.paymentStatus));
  assert.ok(statuses.has('Paid') && statuses.has('Pending'));
  for (const p of data.payroll) {
    assert.ok(Number.isFinite(p.netSalary) && p.netSalary >= 0);
    if (p.paymentStatus === 'Paid') assert.ok(p.paidDate);
  }
});

test('deterministic for the same date', () => {
  assert.deepEqual(buildSeedData(today), data);
});
