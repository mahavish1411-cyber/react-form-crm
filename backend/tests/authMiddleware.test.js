const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { requireAuth, requireWrite } = require('../middleware/auth');
const { signToken } = require('../utils/tokens');

function run(mw, req) {
  const res = { statusCode: 200 };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  let nextCalled = false;
  mw(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
});

test('no header -> 401', () => {
  const { res, nextCalled } = run(requireAuth, { headers: {} });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('malformed header -> 401', () => {
  assert.equal(run(requireAuth, { headers: { authorization: 'Token abc' } }).res.statusCode, 401);
  assert.equal(run(requireAuth, { headers: { authorization: 'Bearer' } }).res.statusCode, 401);
});

test('tampered token -> 401', () => {
  const t = signToken({ id: '1', role: 'admin' });
  const bad = t.slice(0, -2) + (t.endsWith('aa') ? 'bb' : 'aa');
  assert.equal(run(requireAuth, { headers: { authorization: `Bearer ${bad}` } }).res.statusCode, 401);
});

test('expired token -> 401', () => {
  const t = signToken({ id: '1', role: 'admin' }, '-1s');
  assert.equal(run(requireAuth, { headers: { authorization: `Bearer ${t}` } }).res.statusCode, 401);
});

test('valid admin token -> next, req.user set', () => {
  const t = signToken({ id: '1', role: 'admin' });
  const req = { headers: { authorization: `Bearer ${t}` } };
  const { nextCalled } = run(requireAuth, req);
  assert.equal(nextCalled, true);
  assert.equal(req.user.role, 'admin');
});

test('requireWrite: viewer on POST -> 403, admin -> next, viewer on GET -> next', () => {
  const v = run(requireWrite, { method: 'POST', user: { role: 'viewer' } });
  assert.equal(v.res.statusCode, 403);
  assert.equal(v.nextCalled, false);
  assert.equal(run(requireWrite, { method: 'DELETE', user: { role: 'admin' } }).nextCalled, true);
  assert.equal(run(requireWrite, { method: 'GET', user: { role: 'viewer' } }).nextCalled, true);
});
