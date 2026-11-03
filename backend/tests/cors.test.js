const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildCorsOptions } = require('../utils/corsOptions');

const check = (opts, origin) =>
  new Promise((resolve, reject) =>
    opts.origin(origin, (err, allowed) => (err ? reject(err) : resolve(allowed)))
  );

test('listed origin is allowed', async () => {
  const o = buildCorsOptions('https://crm.vercel.app,https://other.com');
  assert.equal(await check(o, 'https://crm.vercel.app'), true);
});
test('unlisted origin is rejected', async () => {
  const o = buildCorsOptions('https://crm.vercel.app');
  assert.equal(await check(o, 'https://evil.com'), false);
});
test('wildcard matches preview URLs', async () => {
  const o = buildCorsOptions('https://*.vercel.app');
  assert.equal(await check(o, 'https://my-app-git-x.vercel.app'), true);
  assert.equal(await check(o, 'https://vercel.app.evil.com'), false);
});
test('empty env allows only localhost:5173', async () => {
  const o = buildCorsOptions('');
  assert.equal(await check(o, 'http://localhost:5173'), true);
  assert.equal(await check(o, 'https://crm.vercel.app'), false);
});
test('requests without Origin are allowed', async () => {
  assert.equal(await check(buildCorsOptions('https://a.com'), undefined), true);
});
