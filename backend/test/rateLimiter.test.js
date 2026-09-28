const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const limiter = require('../src/middleware/rateLimiter');

async function withServer(userId, run) {
  const app = express();
  app.use((req, res, next) => {
    if (userId) req.user = { id: userId };
    next();
  });
  app.use(limiter);
  app.get('/api/thing', (req, res) => res.json({ ok: true }));
  app.post('/api/activity/track', (req, res) => res.status(204).end());
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function hit(url, times, init) {
  let last;
  for (let i = 0; i < times; i++) last = await fetch(url, init);
  return last;
}

test('a signed-in user can make a normal session worth of requests', async () => {
  await withServer('user-session', async base => {
    const res = await hit(`${base}/api/thing`, 300);
    assert.equal(res.status, 200);
  });
});

test('anonymous tracking calls still count against the IP budget', async () => {
  await withServer(null, async base => {
    const res = await fetch(`${base}/api/activity/track`, { method: 'POST' });
    assert.equal(res.headers.get('ratelimit-remaining'), String(limiter.globalMax({}) - 1));
  });
});

test('anonymous traffic is still capped, with a message and code the UI can use', async () => {
  await withServer(null, async base => {
    const res = await hit(`${base}/api/thing`, limiter.globalMax({}) + 1);
    assert.equal(res.status, 429);
    const body = await res.json();
    assert.equal(body.code, 'RATE_LIMIT');
    assert.match(body.error, /^Too many requests to Code Quest\. Try again in \d+ minutes?\.$/);
  });
});

test('fire-and-forget tracking does not spend the shared budget', async () => {
  await withServer('user-tracking', async base => {
    await hit(`${base}/api/activity/track`, 50, { method: 'POST' });
    const res = await fetch(`${base}/api/thing`);
    assert.equal(res.headers.get('ratelimit-remaining'), String(limiter.globalMax({ user: {} }) - 1));
  });
});

test('the wait falls back to "shortly" without a usable Retry-After', () => {
  assert.equal(limiter.rateLimitMessage(undefined), 'Too many requests to Code Quest. Try again shortly.');
  assert.equal(limiter.rateLimitMessage('30'), 'Too many requests to Code Quest. Try again in 30 seconds.');
});
