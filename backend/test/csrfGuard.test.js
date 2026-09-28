const test = require('node:test');
const assert = require('node:assert/strict');
const { isRequestAllowed } = require('../src/middleware/csrfGuard');

const ALLOWED = ['https://codequest.app'];
const req = (method, site, origin) => ({ method, headers: { 'sec-fetch-site': site, origin } });

test('safe methods are always allowed', () => {
  assert.equal(isRequestAllowed(req('GET', 'cross-site', 'https://evil.example'), ALLOWED), true);
  assert.equal(isRequestAllowed(req('OPTIONS', 'cross-site', 'https://evil.example'), ALLOWED), true);
});

test('same-origin, same-site and direct requests are allowed', () => {
  for (const site of ['same-origin', 'same-site', 'none', undefined]) {
    assert.equal(isRequestAllowed(req('PUT', site), ALLOWED), true, String(site));
  }
});

test('a cross-site write from the configured frontend is allowed', () => {
  assert.equal(isRequestAllowed(req('PUT', 'cross-site', 'https://codequest.app'), ALLOWED), true);
});

test('a cross-site write from any other origin is blocked', () => {
  assert.equal(isRequestAllowed(req('PUT', 'cross-site', 'https://evil.example'), ALLOWED), false);
  assert.equal(isRequestAllowed(req('POST', 'cross-site', 'https://codequest.app.evil.example'), ALLOWED), false);
  assert.equal(isRequestAllowed(req('DELETE', 'cross-site', undefined), ALLOWED), false);
  assert.equal(isRequestAllowed(req('PUT', 'cross-site', 'null'), ALLOWED), false);
});
