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
