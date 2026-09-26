const test = require('node:test');
const assert = require('node:assert/strict');
const { computeMergeStats, median } = require('../src/services/mergeLikelihoodService');

const NOW = Date.parse('2026-09-26T12:00:00Z');
const ago = d => new Date(NOW - d * 86400000).toISOString();
const pr = ({ assoc = 'CONTRIBUTOR', login = 'lina', type = 'User', created = 20, merged = null } = {}) => ({
  author_association: assoc,
  user: { login, type },
  created_at: ago(created),
  merged_at: merged === null ? null : ago(merged),
});

test('bots are excluded from the sample', () => {
  const closed = [
    pr({ login: 'dependabot[bot]', type: 'Bot', assoc: 'NONE', created: 3, merged: 2 }),
    pr({ login: 'renovate-bot', assoc: 'NONE', created: 3, merged: 2 }),
    pr({ created: 10, merged: 8 }),
  ];
  const s = computeMergeStats(closed, [], NOW);
  assert.equal(s.sample_size, 1);
  assert.equal(s.merged_count, 1);
});

test('maintainer PRs are excluded, outside contributors of any history are counted', () => {
  const closed = [
    pr({ assoc: 'MEMBER', created: 5, merged: 4 }),
    pr({ assoc: 'OWNER', created: 5, merged: 4 }),
    pr({ assoc: 'COLLABORATOR', created: 5, merged: 4 }),
    pr({ assoc: 'CONTRIBUTOR', created: 5, merged: 4 }),
    pr({ assoc: 'FIRST_TIME_CONTRIBUTOR', created: 5 }),
    pr({ assoc: 'NONE', created: 5 }),
  ];
  const s = computeMergeStats(closed, [], NOW);
  assert.equal(s.sample_size, 3);
  assert.equal(s.merged_count, 1);
});

test('long-open outside PRs count as not merged; recent ones are ignored', () => {
  const closed = Array.from({ length: 5 }, () => pr({ created: 20, merged: 18 }));
  const open = [pr({ created: 45 }), pr({ created: 90 }), pr({ created: 3 })];
  const s = computeMergeStats(closed, open, NOW);
  assert.equal(s.waiting_count, 2);
  assert.equal(s.sample_size, 7);
  assert.equal(s.merge_rate, 71);
});

test('a small sample is reported as unknown, not high', () => {
  const s = computeMergeStats([pr({ created: 5, merged: 4 })], [], NOW);
  assert.equal(s.likelihood, 'unknown');
  assert.equal(s.merge_rate, 100);
  assert.equal(s.sample_size, 1);
});

test('tiers follow the merge rate once the sample is large enough', () => {
  const make = (mergedN, total) => [
    ...Array.from({ length: mergedN }, () => pr({ created: 10, merged: 8 })),
    ...Array.from({ length: total - mergedN }, () => pr({ created: 10 })),
  ];
  assert.equal(computeMergeStats(make(7, 10), [], NOW).likelihood, 'high');
  assert.equal(computeMergeStats(make(4, 10), [], NOW).likelihood, 'medium');
  assert.equal(computeMergeStats(make(2, 10), [], NOW).likelihood, 'low');
});

test('median days to merge ignores a single extreme outlier', () => {
  const closed = [
    pr({ created: 12, merged: 10 }), // 2d
    pr({ created: 13, merged: 10 }), // 3d
    pr({ created: 410, merged: 10 }), // 400d
  ];
  assert.equal(computeMergeStats(closed, [], NOW).median_days_to_merge, 3);
});

test('median handles even, odd and empty inputs', () => {
  assert.equal(median([]), null);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

test('no outside PRs at all yields nulls and unknown', () => {
  const s = computeMergeStats([pr({ assoc: 'MEMBER', created: 5, merged: 4 })], [], NOW);
  assert.deepEqual(
    { likelihood: s.likelihood, rate: s.merge_rate, days: s.median_days_to_merge, n: s.sample_size },
    { likelihood: 'unknown', rate: null, days: null, n: 0 },
  );
});
