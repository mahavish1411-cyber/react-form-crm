const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../middleware/validate');
const {
  payrollListQuery, payrollGenerate, payrollGenerateAll, payrollRecalculate,
} = require('../validation/schemas');

function run(mw, req) {
  const res = { statusCode: 200 };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  let nextCalled = false;
  mw(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

const list = (query) => run(validate(payrollListQuery, 'query'), { query });

test('list rejects malformed month and unknown paymentStatus', () => {
  for (const month of ['2026-13', 'abc', '2026-1', '2026-00']) {
    assert.equal(list({ month }).res.statusCode, 400, month);
  }
  assert.equal(list({ paymentStatus: 'Refunded' }).res.statusCode, 400);
});

test('list accepts valid and empty filters', () => {
  assert.equal(list({ month: '2026-09' }).nextCalled, true);
  assert.equal(list({ paymentStatus: 'Paid' }).nextCalled, true);
  assert.equal(list({}).nextCalled, true);
});

test('otherDeduction must be a non-negative number on generate, generate-all, recalculate', () => {
  const body = (extra) => ({ employeeId: 'x', month: '2026-09', ...extra });
  for (const schema of [payrollGenerate, payrollGenerateAll, payrollRecalculate]) {
    assert.equal(run(validate(schema), { body: body({ otherDeduction: -5 }) }).res.statusCode, 400);
    assert.equal(run(validate(schema), { body: body({ otherDeduction: 'abc' }) }).res.statusCode, 400);
    assert.equal(run(validate(schema), { body: body({ otherDeduction: 0 }) }).nextCalled, true);
  }
});
