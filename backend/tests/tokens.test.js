const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { signToken, verifyToken } = require('../utils/tokens');

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
});

test('sign/verify round-trip returns id and role', () => {
  const token = signToken({ id: 'abc', role: 'admin' });
  assert.deepEqual(verifyToken(token), { id: 'abc', role: 'admin' });
});

test('tampered token throws', () => {
  const token = signToken({ id: 'abc', role: 'viewer' });
  const bad = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
  assert.throws(() => verifyToken(bad));
});

test('expired token throws', () => {
  const token = signToken({ id: 'abc', role: 'admin' }, '-1s');
  assert.throws(() => verifyToken(token));
});

test('missing JWT_SECRET throws on sign and verify', () => {
  const token = signToken({ id: 'abc', role: 'admin' });
  delete process.env.JWT_SECRET;
  assert.throws(() => signToken({ id: 'abc', role: 'admin' }));
  assert.throws(() => verifyToken(token));
});
