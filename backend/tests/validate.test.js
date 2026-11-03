const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../middleware/validate');
const { employeeCreate, employeeUpdate } = require('../validation/schemas');

function run(mw, req) {
  const res = { statusCode: 200 };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  let nextCalled = false;
  mw(req, res, () => { nextCalled = true; });
  return { res, nextCalled, req };
}

const valid = {
  employeeId: 'E1', name: 'A', email: 'a@x.com', phone: '1',
  department: 'Eng', designation: 'Dev', basicSalary: '1000', allowance: 0, deduction: 0,
};

test('valid payload passes and numeric strings are coerced', () => {
  const { nextCalled, req } = run(validate(employeeCreate), { body: { ...valid } });
  assert.equal(nextCalled, true);
  assert.equal(req.body.basicSalary, 1000);
});

test('missing required employee field -> 400 naming the field', () => {
  const { name, ...rest } = valid;
  const { res, nextCalled } = run(validate(employeeCreate), { body: rest });
  assert.equal(res.statusCode, 400);
  assert.equal(nextCalled, false);
  assert.ok(res.body.errors.some((e) => e.path === 'name'));
});

test('negative basicSalary, allowance, deduction -> 400', () => {
  for (const f of ['basicSalary', 'allowance', 'deduction']) {
    const { res } = run(validate(employeeCreate), { body: { ...valid, [f]: -1 } });
    assert.equal(res.statusCode, 400, f);
  }
});

test('non-numeric salary -> 400', () => {
  const { res } = run(validate(employeeCreate), { body: { ...valid, basicSalary: 'abc' } });
  assert.equal(res.statusCode, 400);
});

test('employeeUpdate allows partial bodies but still rejects negatives', () => {
  assert.equal(run(validate(employeeUpdate), { body: { name: 'B' } }).nextCalled, true);
  assert.equal(run(validate(employeeUpdate), { body: { allowance: -5 } }).res.statusCode, 400);
});
