const test = require('node:test');
const assert = require('node:assert/strict');
const { pickFailedChecks, buildReviewChecklist, extractLogExcerpt } = require('../src/services/prFeedbackService');

const at = minutes => new Date(Date.parse('2026-09-20T10:00:00Z') + minutes * 60000).toISOString();
const user = (login, type = 'User') => ({ login, type });
const review = (id, login, state, minutes, body = '') => ({ id, user: user(login), state, submitted_at: at(minutes), body, html_url: `https://github.com/o/r/pull/1#pullrequestreview-${id}` });
const comment = (id, login, reviewId, minutes, extra = {}) => ({
  id,
  user: user(login),
  pull_request_review_id: reviewId,
  body: `comment ${id}`,
  path: 'src/app.js',
  line: 10,
  created_at: at(minutes),
  ...extra,
});

test('failed checks keep only failing conclusions and flag Actions jobs', () => {
  const failed = pickFailedChecks([
    { id: 1, name: 'build', conclusion: 'failure', app: { slug: 'github-actions' } },
    { id: 2, name: 'lint', conclusion: 'success', app: { slug: 'github-actions' } },
    { id: 3, name: 'deploy', conclusion: 'timed_out', app: { slug: 'vercel' } },
    { id: 4, name: 'optional', conclusion: 'neutral' },
    { id: 5, name: 'running', conclusion: null },
  ]);
  assert.deepEqual(failed.map(c => [c.name, c.isActions]), [['build', true], ['deploy', false]]);
});

test('only the newest status per context counts', () => {
  const failed = pickFailedChecks([], [
    { id: 11, context: 'ci/circleci', state: 'success' },
    { id: 10, context: 'ci/circleci', state: 'failure' },
    { id: 12, context: 'coverage', state: 'error', description: 'dropped 2%' },
  ]);
  assert.deepEqual(failed.map(c => c.name), ['coverage']);
  assert.equal(failed[0].description, 'dropped 2%');
});

test('no reviews means nothing requested', () => {
  assert.deepEqual(buildReviewChecklist([], []), { requestedBy: [], items: [] });
});

test('an outstanding request lists the review body and its inline comments', () => {
  const { requestedBy, items } = buildReviewChecklist(
    [review(100, 'maria', 'CHANGES_REQUESTED', 0, 'Please add tests.')],
    [comment(1, 'maria', 100, 0), comment(2, 'maria', 100, 1, { line: null, original_line: 4 })],
  );
  assert.deepEqual(requestedBy, ['maria']);
  assert.deepEqual(items.map(i => i.id), ['review-100', 'comment-1', 'comment-2']);
  assert.equal(items[2].outdated, true);
  assert.equal(items[2].line, 4);
});

test('a later approval by the same reviewer clears their request', () => {
  const result = buildReviewChecklist(
    [review(100, 'maria', 'CHANGES_REQUESTED', 0, 'Please add tests.'), review(101, 'maria', 'APPROVED', 60)],
    [comment(1, 'maria', 100, 0)],
  );
  assert.deepEqual(result, { requestedBy: [], items: [] });
});

test('a comment-only review does not clear a request', () => {
  const { requestedBy, items } = buildReviewChecklist(
    [review(100, 'maria', 'CHANGES_REQUESTED', 0), review(101, 'maria', 'COMMENTED', 30, 'Also rename this.')],
    [comment(1, 'maria', 100, 0)],
  );
  assert.deepEqual(requestedBy, ['maria']);
  assert.deepEqual(items.map(i => i.id), ['comment-1', 'review-101']);
});

test('feedback from before an earlier approval is not listed again', () => {
  const { items } = buildReviewChecklist(
    [
      review(100, 'maria', 'CHANGES_REQUESTED', 0, 'Old point.'),
      review(101, 'maria', 'APPROVED', 10),
      review(102, 'maria', 'CHANGES_REQUESTED', 20, 'New point.'),
    ],
    [comment(1, 'maria', 100, 0), comment(2, 'maria', 102, 20)],
  );
  assert.deepEqual(items.map(i => i.id), ['review-102', 'comment-2']);
});

test('replies, bots, other reviewers and empty bodies are left out', () => {
  const { requestedBy, items } = buildReviewChecklist(
    [
      review(100, 'maria', 'CHANGES_REQUESTED', 0),
      review(200, 'jonas', 'APPROVED', 0, 'LGTM'),
      { ...review(300, 'renovate[bot]', 'CHANGES_REQUESTED', 0, 'bump'), user: user('renovate[bot]', 'Bot') },
    ],
    [
      comment(1, 'maria', 100, 0),
      comment(2, 'author', 100, 1, { in_reply_to_id: 1 }),
      comment(3, 'jonas', 200, 0),
      comment(4, 'maria', 100, 2, { body: '   ' }),
    ],
  );
  assert.deepEqual(requestedBy, ['maria']);
  assert.deepEqual(items.map(i => i.id), ['comment-1']);
});

test('a dismissed request is not outstanding', () => {
  const result = buildReviewChecklist(
    [review(100, 'maria', 'CHANGES_REQUESTED', 0, 'x'), review(101, 'maria', 'DISMISSED', 5)],
    [comment(1, 'maria', 100, 0)],
  );
  assert.deepEqual(result.items, []);
});

test('the log excerpt strips colours and timestamps and keeps error lines and the tail', () => {
  const log = [
    '2026-09-20T10:00:00.1234567Z \x1b[32mInstalling\x1b[0m',
    '2026-09-20T10:00:01.0000000Z FAIL src/app.test.js',
    '2026-09-20T10:00:02.0000000Z   Error: expected 2 to equal 3',
    '2026-09-20T10:00:03.0000000Z Done',
  ].join('\n');
  const excerpt = extractLogExcerpt(log);
  assert.ok(!excerpt.includes('\x1b['));
  assert.ok(!excerpt.includes('2026-09-20T'));
  assert.match(excerpt, /Lines that mention errors:\n.*Error: expected 2 to equal 3/);
  assert.match(excerpt, /End of the log:\n[\s\S]*Done$/);
});

test('a huge log is bounded', () => {
  const log = Array.from({ length: 50000 }, (_, i) => `line ${i} error here`).join('\n');
  assert.ok(extractLogExcerpt(log).length < 10000);
});

test('an empty or missing log gives an empty excerpt', () => {
  assert.equal(extractLogExcerpt(''), '');
  assert.equal(extractLogExcerpt(undefined), '');
});
