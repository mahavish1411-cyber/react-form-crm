const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { login, demoLogin } = require('../controllers/authController');

function mockRes() {
  const res = { statusCode: 200 };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.DEMO_MODE = 'true';
});

test('wrong password and unknown email give identical 401 bodies', async () => {
  const hash = await bcrypt.hash('right', 4);
  User.findOne = async (q) =>
    q.email === 'known@x.com' ? { _id: 'u1', email: 'known@x.com', passwordHash: hash, role: 'admin' } : null;

  const a = mockRes();
  await login({ body: { email: 'known@x.com', password: 'wrong' } }, a);
  const b = mockRes();
  await login({ body: { email: 'nobody@x.com', password: 'wrong' } }, b);

  assert.equal(a.statusCode, 401);
  assert.equal(b.statusCode, 401);
  assert.deepEqual(a.body, b.body);
});

test('valid login returns a token and role', async () => {
  const hash = await bcrypt.hash('right', 4);
  User.findOne = async () => ({ _id: 'u1', email: 'known@x.com', passwordHash: hash, role: 'admin' });
  const res = mockRes();
  await login({ body: { email: 'known@x.com', password: 'right' } }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.role, 'admin');
});

test('demoLogin returns 404 when DEMO_MODE is not true', async () => {
  process.env.DEMO_MODE = 'false';
  const res = mockRes();
  await demoLogin({}, res);
  assert.equal(res.statusCode, 404);
});

test('demoLogin returns an admin token when demo user exists', async () => {
  User.findOne = async () => ({ _id: 'd1', email: 'demo@crm.dev', role: 'admin', isDemo: true });
  const res = mockRes();
  await demoLogin({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.role, 'admin');
});
