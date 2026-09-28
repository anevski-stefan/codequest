const test = require('node:test');
const assert = require('node:assert/strict');
const GitHubService = require('../src/services/githubService');
const { buildRepoAccessQuery, isCacheableGraphQLResponse } = require('../src/services/githubService');

test('the bulk merge likelihood endpoint can reach the access check', () => {
  assert.equal(typeof GitHubService.verifyReposAccess, 'function');
});

test('repository names reach GraphQL only through variables', () => {
  const hostile = 'x") { id } viewer { login } a: repository(owner: "y';
  const { query, variables } = buildRepoAccessQuery([
    { owner: 'facebook', repo: 'react' },
    { owner: hostile, repo: hostile },
  ]);
  assert.equal(query.includes(hostile), false);
  assert.equal(query.includes('facebook'), false);
  assert.deepEqual(variables, { o0: 'facebook', n0: 'react', o1: hostile, n1: hostile });
  assert.match(query, /^query\(\$o0: String!, \$n0: String!, \$o1: String!, \$n1: String!\)/);
  assert.match(query, /r1: repository\(owner: \$o1, name: \$n1\) \{ id \}/);
});

test('a GraphQL rate-limit reply is never cached, partial data is', () => {
  assert.equal(isCacheableGraphQLResponse({ status: 200, data: { data: { r0: { id: '1' }, r1: null }, errors: [{ type: 'NOT_FOUND' }] } }), true);
  assert.equal(isCacheableGraphQLResponse({ status: 200, data: { data: null, errors: [{ type: 'RATE_LIMITED' }] } }), false);
  assert.equal(isCacheableGraphQLResponse({ status: 200, data: { data: {}, errors: [{ type: 'RATE_LIMITED' }] } }), false);
  assert.equal(isCacheableGraphQLResponse({ status: 502, data: {} }), false);
});
