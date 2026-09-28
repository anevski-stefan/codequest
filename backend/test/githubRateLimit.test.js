const test = require('node:test');
const assert = require('node:assert/strict');
const { detectRateLimit, GitHubApiError } = require('../src/utils/httpError');

const NOW = Date.parse('2026-09-28T10:00:00Z');
const nowSeconds = NOW / 1000;
const response = (status, headers = {}, message = '') => ({ status, headers, data: { message } });

test('an exhausted primary limit waits until the reset time', () => {
  const result = detectRateLimit(response(403, {
    'x-ratelimit-remaining': '0',
    'x-ratelimit-reset': String(nowSeconds + 42),
    'x-ratelimit-resource': 'search',
  }, 'API rate limit exceeded for user ID 1.'), NOW);
  assert.deepEqual(result, {
    kind: 'primary', resource: 'search', githubStatus: 403, remaining: '0',
    message: 'API rate limit exceeded for user ID 1.', retryAfterSeconds: 42,
  });
});

test('a secondary limit uses retry-after', () => {
  const result = detectRateLimit(response(403, { 'retry-after': '30', 'x-ratelimit-remaining': '12' },
    'You have exceeded a secondary rate limit. Please wait a few minutes before you try again.'), NOW);
  assert.equal(result.kind, 'secondary');
  assert.equal(result.retryAfterSeconds, 30);
});

test('a secondary limit without headers waits a minute', () => {
  const result = detectRateLimit(response(403, {}, 'You have exceeded a secondary rate limit'), NOW);
  assert.equal(result.retryAfterSeconds, 60);
});

test('a reset time already in the past still waits at least a second', () => {
  const result = detectRateLimit(response(429, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(nowSeconds - 5) }), NOW);
  assert.equal(result.retryAfterSeconds, 1);
});

test('a permission 403 is not a rate limit', () => {
  assert.equal(detectRateLimit(response(403, { 'x-ratelimit-remaining': '4999' }, 'Resource not accessible by integration'), NOW), null);
  assert.equal(detectRateLimit(response(404, { 'x-ratelimit-remaining': '0' }), NOW), null);
  assert.equal(detectRateLimit(undefined, NOW), null);
});

test('GitHubApiError turns a rate-limited 403 into a 429 with a wait time', () => {
  const error = new GitHubApiError('GitHub API request failed', {
    response: response(403, { 'retry-after': '90' }, 'You have exceeded a secondary rate limit'),
  });
  assert.equal(error.status, 429);
  assert.equal(error.code, 'GITHUB_RATE_LIMIT');
  assert.equal(error.retryAfterSeconds, 90);
  assert.match(error.message, /Try again in 2 minutes/);
});

test('GitHubApiError keeps other statuses unchanged', () => {
  const error = new GitHubApiError('GitHub API request failed', { response: response(404, {}, 'Not Found') });
  assert.equal(error.status, 404);
  assert.equal(error.message, 'GitHub API request failed');
  assert.equal(error.code, undefined);
});

test('a 429 without headers or a secondary message is an unknown limit that waits a minute', () => {
  const result = detectRateLimit(response(429, { 'x-ratelimit-remaining': '5' }), NOW);
  assert.equal(result.kind, 'unknown');
  assert.equal(result.retryAfterSeconds, 60);
});

test('a GraphQL RATE_LIMITED error on HTTP 200 is a primary graphql limit', () => {
  const result = detectRateLimit({
    status: 200,
    headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(nowSeconds + 120) },
    data: { errors: [{ type: 'RATE_LIMITED', message: 'API rate limit exceeded' }] },
  }, NOW);
  assert.equal(result.kind, 'primary');
  assert.equal(result.resource, 'graphql');
  assert.equal(result.retryAfterSeconds, 120);
});

test('other GraphQL errors on HTTP 200 are not rate limits and become a 500', () => {
  const graphqlResponse = { status: 200, headers: {}, data: { errors: [{ type: 'NOT_FOUND' }] } };
  assert.equal(detectRateLimit(graphqlResponse, NOW), null);
  assert.equal(new GitHubApiError('GitHub API request failed', { response: graphqlResponse }).status, 500);
});
