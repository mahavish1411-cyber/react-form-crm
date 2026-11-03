const { test } = require('node:test');
const assert = require('node:assert/strict');
const { msUntilNextReset, startDemoLifecycle } = require('../scripts/demoLifecycle');

test('msUntilNextReset is the time to the next 03:00 UTC', () => {
  const HOUR = 3600 * 1000;
  assert.equal(msUntilNextReset(new Date(Date.UTC(2026, 10, 3, 0, 0, 0))), 3 * HOUR);
  assert.equal(msUntilNextReset(new Date(Date.UTC(2026, 10, 3, 3, 0, 0))), 24 * HOUR);
  assert.equal(msUntilNextReset(new Date(Date.UTC(2026, 10, 3, 4, 0, 0))), 23 * HOUR);
});

test('startDemoLifecycle does nothing unless DEMO_MODE=true', () => {
  assert.equal(startDemoLifecycle({}), false);
  assert.equal(startDemoLifecycle({ DEMO_MODE: 'false' }), false);
});

const { ensureDemoUser } = require('../scripts/demoLifecycle');

test('ensureDemoUser creates a demo user when missing and never deletes anything', async () => {
  const created = [];
  const User = {
    findOne: async () => null,
    create: async (doc) => { created.push(doc); return doc; },
    deleteMany: async () => { throw new Error('must not delete'); },
  };
  await ensureDemoUser({ User, env: { DEMO_LOGIN: 'true', DEMO_ROLE: 'viewer' } });
  assert.equal(created.length, 1);
  assert.equal(created[0].isDemo, true);
  assert.equal(created[0].role, 'viewer');
  assert.ok(created[0].passwordHash);
});

test('ensureDemoUser defaults to admin and syncs the role of an existing demo user', async () => {
  const updated = [];
  const existing = { isDemo: true, role: 'viewer', save: async function () { updated.push(this.role); } };
  const User = { findOne: async () => existing, create: async () => { throw new Error('no create'); } };
  await ensureDemoUser({ User, env: { DEMO_LOGIN: 'true' } });
  assert.deepEqual(updated, ['admin']);
});

test('startDemoLifecycle returns false when only DEMO_LOGIN is unset/false', () => {
  assert.equal(startDemoLifecycle({ DEMO_LOGIN: 'false' }), false);
});
