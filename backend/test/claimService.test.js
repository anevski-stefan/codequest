const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyClaim, isClaimComment, buildClaimsQuery } = require('../src/services/claimService');

const NOW = Date.parse('2026-09-26T12:00:00Z');
const ago = days => new Date(NOW - days * 86400000).toISOString();
const issue = (nodes = [], extra = {}) => ({ state: 'OPEN', assignees: { nodes: [] }, timelineItems: { nodes }, ...extra });
const comment = (body, days, login = 'lina') => ({ __typename: 'IssueComment', body, createdAt: ago(days), author: { login } });
const pr = (overrides = {}) => ({ __typename: 'PullRequest', number: 42, url: 'https://github.com/o/r/pull/42', state: 'OPEN', isDraft: false, updatedAt: ago(2), author: { login: 'tomasz' }, ...overrides });

test('an issue with no activity is free', () => {
  assert.equal(classifyClaim(issue(), NOW).status, 'free');
});

test('closed issues are closed', () => {
  assert.equal(classifyClaim(issue([], { state: 'CLOSED' }), NOW).status, 'closed');
});

test('missing issue data is unknown, not free', () => {
  assert.equal(classifyClaim(null, NOW).status, 'unknown');
});

test('an open PR that will close the issue means in progress', () => {
  const c = classifyClaim(issue([{ __typename: 'CrossReferencedEvent', willCloseTarget: true, createdAt: ago(3), source: pr() }]), NOW);
  assert.equal(c.status, 'in_progress');
  assert.equal(c.pr.number, 42);
  assert.match(c.reason, /PR #42 is open by tomasz/);
});

test('a PR that only mentions the issue does not count', () => {
  const c = classifyClaim(issue([{ __typename: 'CrossReferencedEvent', willCloseTarget: false, createdAt: ago(3), source: pr() }]), NOW);
  assert.equal(c.status, 'free');
});

test('a connected PR idle for 30+ days is stale', () => {
  const c = classifyClaim(issue([{ __typename: 'ConnectedEvent', createdAt: ago(60), subject: pr({ updatedAt: ago(45) }) }]), NOW);
  assert.equal(c.status, 'stale');
  assert.match(c.reason, /idle for 45 days/);
});

test('a merged PR does not block the issue', () => {
  const c = classifyClaim(issue([{ __typename: 'ConnectedEvent', createdAt: ago(5), subject: pr({ state: 'MERGED' }) }]), NOW);
  assert.equal(c.status, 'free');
});

test('recent assignment is in progress, old assignment without PR is stale', () => {
  const recent = issue([{ __typename: 'AssignedEvent', createdAt: ago(4), assignee: { login: 'priya' } }], { assignees: { nodes: [{ login: 'priya' }] } });
  assert.equal(classifyClaim(recent, NOW).status, 'in_progress');
  const old = issue([{ __typename: 'AssignedEvent', createdAt: ago(40), assignee: { login: 'priya' } }], { assignees: { nodes: [{ login: 'priya' }] } });
  const c = classifyClaim(old, NOW);
  assert.equal(c.status, 'stale');
  assert.equal(c.claimant, 'priya');
});

test('a recent claim comment is requested; an old one is stale', () => {
  assert.equal(classifyClaim(issue([comment("Hi, I'd like to work on this!", 2)]), NOW).status, 'requested');
  assert.equal(classifyClaim(issue([comment('Can I take this one?', 30)]), NOW).status, 'stale');
});

test('bot comments are ignored', () => {
  assert.equal(classifyClaim(issue([comment('/assign', 1, 'github-actions[bot]')]), NOW).status, 'free');
});

test('claim phrases are recognised and ordinary comments are not', () => {
  for (const s of ["I'd like to work on this", 'Can I work on this?', 'could i be assigned?', 'please assign it to me', '/assign', "I'm working on this", 'I will take this']) {
    assert.ok(isClaimComment(s), s);
  }
  for (const s of ['I can reproduce this', 'Thanks for the report', 'This also happens on Windows', 'Could you share logs?']) {
    assert.ok(!isClaimComment(s), s);
  }
});

test('buildClaimsQuery passes user input only through variables', () => {
  const { query, variables } = buildClaimsQuery([{ owner: 'evil") { x }', repo: 'r', number: 7 }]);
  assert.ok(!query.includes('evil'));
  assert.equal(variables.o0, 'evil") { x }');
  assert.equal(variables.n0, 7);
});
