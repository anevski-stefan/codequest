const test = require('node:test');
const assert = require('node:assert/strict');
const { planNotifications, toNotificationRow, buildSeenKeys, silenceThresholdDays, planAttributedOutcomes, buildOutcomeKeys, isCoolingDown } = require('../src/services/prTrackerService');

const NOW = Date.parse('2026-09-26T12:00:00Z');
const ago = d => new Date(NOW - d * 86400000).toISOString();

const pullRequest = ({
  number = 7,
  title = 'Fix the widget',
  isDraft = false,
  createdDaysAgo = 3,
  updatedDaysAgo = 1,
  ciState = 'SUCCESS',
  checks = [],
  mergeable = 'MERGEABLE',
  reviews = [],
  issueNumber = null,
  issueNumbers = issueNumber ? [issueNumber] : [],
  headOid = 'abc123',
  nameWithOwner = 'vercel/next.js',
  isPrivate = false,
  committedDaysAgo = updatedDaysAgo,
} = {}) => ({
  number,
  title,
  url: `https://github.com/${nameWithOwner}/pull/${number}`,
  isDraft,
  mergeable,
  createdAt: ago(createdDaysAgo),
  updatedAt: ago(updatedDaysAgo),
  headRefOid: { oid: headOid },
  repository: { nameWithOwner, isPrivate },
  closingIssuesReferences: { nodes: issueNumbers.map(number => ({ number, repository: { nameWithOwner } })) },
  commits: { nodes: [{ commit: { committedDate: ago(committedDaysAgo), statusCheckRollup: { state: ciState, contexts: { nodes: checks } } } }] },
  latestOpinionatedReviews: {
    nodes: reviews.map((r, i) => ({ submittedAt: ago(r.atDaysAgo ?? i), author: { login: 'maria', __typename: 'User' }, ...r })),
  },
});

const plan = (overrides = {}) => planNotifications({ now: NOW, seen: new Set(), ...overrides });

test('no pull requests plans nothing', () => {
  assert.deepEqual(plan(), []);
});

test('a healthy open PR plans nothing', () => {
  assert.deepEqual(plan({ openPRs: [pullRequest()] }), []);
});

test('failing CI plans one notification keyed on the head commit', () => {
  const planned = plan({ openPRs: [pullRequest({ ciState: 'FAILURE' })] });
  assert.equal(planned.length, 1);
  assert.equal(planned[0].type, 'pr_ci_failed');
  assert.match(planned[0].key, /^pr_ci_failed:.*:abc123$/);
});

test('a new failing run after a green one plans a fresh notification', () => {
  const pr = pullRequest({ ciState: 'FAILURE', headOid: 'def456' });
  const seen = new Set([`pr_ci_failed:${pr.url}:abc123`]);
  const planned = plan({ openPRs: [pr], seen });
  assert.equal(planned.length, 1);
});

test('a request still outstanding on one reviewer is reported whatever another reviewer said later', () => {
  const requested = plan({ openPRs: [pullRequest({ reviews: [{ state: 'CHANGES_REQUESTED' }] })] });
  assert.equal(requested.length, 1);
  assert.equal(requested[0].type, 'pr_changes_requested');

  const standingRequestAndLaterApproval = plan({
    openPRs: [pullRequest({
      reviews: [
        { state: 'CHANGES_REQUESTED', atDaysAgo: 5 },
        { state: 'APPROVED', atDaysAgo: 1, author: { login: 'lee', __typename: 'User' } },
      ],
    })],
  });
  assert.equal(standingRequestAndLaterApproval.length, 1);
  assert.equal(standingRequestAndLaterApproval[0].type, 'pr_changes_requested');
});

test('a reviewer whose latest state is dismissed has no request outstanding', () => {
  assert.deepEqual(plan({ openPRs: [pullRequest({ reviews: [{ state: 'DISMISSED' }] })] }), []);
});

test('an approved review alone plans nothing', () => {
  assert.deepEqual(plan({ openPRs: [pullRequest({ reviews: [{ state: 'APPROVED' }] })] }), []);
});

test('a draft is never reported as silent no matter how stale', () => {
  assert.deepEqual(plan({ openPRs: [pullRequest({ isDraft: true, updatedDaysAgo: 400 })] }), []);
});

test('13 idle days is below the floor and plans nothing', () => {
  assert.deepEqual(plan({ openPRs: [pullRequest({ updatedDaysAgo: 13 })] }), []);
});

test('15 idle days is past the floor and reports silence', () => {
  const planned = plan({ openPRs: [pullRequest({ updatedDaysAgo: 15 })] });
  assert.equal(planned.length, 1);
  assert.equal(planned[0].type, 'pr_silence');
});

test('the silence threshold scales with the repo median but never below the floor', () => {
  assert.equal(silenceThresholdDays(2), 14);
  assert.equal(silenceThresholdDays(30), 60);
  assert.equal(silenceThresholdDays(null), 14);
  assert.equal(silenceThresholdDays(undefined), 14);
  assert.equal(silenceThresholdDays(0), 14);
  assert.equal(silenceThresholdDays(NaN), 14);
});

test('a slow repo tolerates a longer silence than the flat floor', () => {
  const medianDaysByRepo = new Map([['vercel/next.js', 30]]);
  const fast = plan({ openPRs: [pullRequest({ updatedDaysAgo: 15 })] });
  const slow = plan({
    openPRs: [pullRequest({ updatedDaysAgo: 15 })],
    medianDaysByRepo,
  });
  assert.equal(fast.length, 1);
  assert.equal(slow.length, 0);
});

test('actionable notifications open the pull request; silence opens the issue it closes', () => {
  const failing = plan({ openPRs: [pullRequest({ issueNumber: 42, ciState: 'FAILURE' })] });
  assert.equal(failing[0].link, '/explore/vercel/next.js?pr=7');

  const silentWithIssue = plan({ openPRs: [pullRequest({ issueNumber: 42, updatedDaysAgo: 20 })] });
  assert.equal(silentWithIssue[0].link, '/explore/vercel/next.js?issue=42');

  const silentWithoutIssue = plan({ openPRs: [pullRequest({ updatedDaysAgo: 20 })] });
  assert.equal(silentWithoutIssue[0].link, '/explore/vercel/next.js?pr=7');
});

test('a merged PR inside the window notifies once, unread, linking to the issue it closed', () => {
  const merged = { ...pullRequest({ number: 9, issueNumber: 11 }), mergedAt: ago(1) };
  const planned = plan({ mergedPRs: [merged] });
  assert.equal(planned.length, 1);
  assert.equal(planned[0].type, 'pr_merged');
  assert.equal(planned[0].link, '/explore/vercel/next.js?issue=11');
  assert.equal(toNotificationRow('42', planned[0]).is_read, false);
});

test('a merged PR older than the window plans nothing', () => {
  const merged = { ...pullRequest(), mergedAt: ago(31) };
  assert.deepEqual(plan({ mergedPRs: [merged] }), []);
});

test('a PR merged at the window edge is still reported', () => {
  const merged = { ...pullRequest(), mergedAt: ago(29) };
  assert.equal(plan({ mergedPRs: [merged] }).length, 1);
});

test('the stored row carries the plan key so a later sync can recognise it', () => {
  const [planned] = plan({ openPRs: [pullRequest({ ciState: 'FAILURE' })] });
  assert.equal(toNotificationRow('42', planned).dedup_key, planned.key);
});

test('a second sync of the same PR plans nothing after a database round trip', () => {
  const pr = pullRequest({ ciState: 'FAILURE' });
  const first = plan({ openPRs: [pr] });
  assert.equal(first.length, 1);
  const stored = first.map(item => toNotificationRow('42', item));
  assert.deepEqual(plan({ openPRs: [pr], seen: buildSeenKeys(stored) }), []);
});

test('a merged PR is not renotified after a round trip', () => {
  const merged = { ...pullRequest({ number: 9, issueNumber: 11 }), mergedAt: ago(1) };
  const first = plan({ mergedPRs: [merged] });
  const stored = first.map(item => toNotificationRow('42', item));
  assert.deepEqual(plan({ mergedPRs: [merged], seen: buildSeenKeys(stored) }), []);
});

test('two PRs closing the same issue stay separate notifications', () => {
  const mine = pullRequest({ number: 7, issueNumber: 42, ciState: 'FAILURE' });
  const theirs = pullRequest({ number: 8, issueNumber: 42, ciState: 'FAILURE' });
  const first = plan({ openPRs: [mine, theirs] });
  assert.equal(first.length, 2);
  assert.notEqual(first[0].link, first[1].link);

  const stored = first.map(item => toNotificationRow('42', item));
  assert.notEqual(stored[0].dedup_key, stored[1].dedup_key);
  assert.equal(plan({ openPRs: [mine, theirs], seen: buildSeenKeys(stored) }).length, 0);
});

test('rows without a key are ignored rather than collapsed into a bogus match', () => {
  const pr = pullRequest({ ciState: 'FAILURE' });
  const first = plan({ openPRs: [pr] });
  const stored = first.map(item => ({ ...toNotificationRow('42', item), dedup_key: null }));
  assert.equal(plan({ openPRs: [pr], seen: buildSeenKeys(stored) }).length, 1);
});

test('a pull request with no repository is skipped without losing the rest of the batch', () => {
  const broken = pullRequest({ ciState: 'FAILURE' });
  delete broken.repository;
  const survivor = pullRequest({ number: 8, ciState: 'FAILURE' });
  const planned = plan({ openPRs: [broken, survivor] });
  assert.equal(planned.length, 1);
  assert.equal(planned[0].key, 'pr_ci_failed:https://github.com/vercel/next.js/pull/8:abc123');
});

test('a linked issue number that is not a positive integer falls back to the pull request link', () => {
  const pr = pullRequest({ ciState: 'FAILURE' });
  pr.closingIssuesReferences = { nodes: [{ number: 'forty-two' }] };
  pr.commits.nodes[0].commit.statusCheckRollup.state = 'SUCCESS';
  pr.updatedAt = ago(20);
  assert.equal(plan({ openPRs: [pr] })[0].link, '/explore/vercel/next.js?pr=7');
});

const checkRun = (name, conclusion) => ({ __typename: 'CheckRun', name, conclusion });
const statusContext = (context, state) => ({ __typename: 'StatusContext', context, state });

test('the CI message names the failing checks and leaves out the passing ones', () => {
  const [planned] = plan({
    openPRs: [pullRequest({
      ciState: 'FAILURE',
      checks: [checkRun('build', 'FAILURE'), checkRun('lint', 'SUCCESS'), statusContext('ci/circleci', 'ERROR')],
    })],
  });
  assert.equal(planned.message, '"Fix the widget" in vercel/next.js (failing: build, ci/circleci)');
});

test('a long list of failing checks is shortened with a count', () => {
  const checks = ['a', 'b', 'c', 'd', 'e'].map(n => checkRun(n, 'FAILURE'));
  const [planned] = plan({ openPRs: [pullRequest({ ciState: 'FAILURE', checks })] });
  assert.match(planned.message, /\(failing: a, b, c and 2 more\)$/);
});

test('a failing rollup with no readable check names still notifies without a list', () => {
  const [planned] = plan({ openPRs: [pullRequest({ ciState: 'FAILURE', checks: [{ __typename: 'CheckRun' }] })] });
  assert.equal(planned.message, '"Fix the widget" in vercel/next.js');
});

test('an errored status rollup counts as failed CI', () => {
  const [planned] = plan({ openPRs: [pullRequest({ ciState: 'ERROR' })] });
  assert.equal(planned.type, 'pr_ci_failed');
});

test('a conflicting PR plans one notification keyed on the head commit', () => {
  const planned = plan({ openPRs: [pullRequest({ mergeable: 'CONFLICTING' })] });
  assert.equal(planned.length, 1);
  assert.equal(planned[0].type, 'pr_conflict');
  assert.match(planned[0].key, /^pr_conflict:.*:abc123$/);
});

test('an unknown mergeable state is not reported as a conflict', () => {
  assert.deepEqual(plan({ openPRs: [pullRequest({ mergeable: 'UNKNOWN' })] }), []);
});

test('a conflict is not reported again after a round trip, but is after a new push', () => {
  const pr = pullRequest({ mergeable: 'CONFLICTING' });
  const stored = plan({ openPRs: [pr] }).map(item => toNotificationRow('42', item));
  assert.deepEqual(plan({ openPRs: [pr], seen: buildSeenKeys(stored) }), []);
  const pushed = pullRequest({ mergeable: 'CONFLICTING', headOid: 'def456' });
  assert.equal(plan({ openPRs: [pushed], seen: buildSeenKeys(stored) }).length, 1);
});

test('a second request for changes after a push notifies again', () => {
  const first = pullRequest({ reviews: [{ state: 'CHANGES_REQUESTED', atDaysAgo: 5 }] });
  const stored = plan({ openPRs: [first] }).map(item => toNotificationRow('42', item));
  assert.deepEqual(plan({ openPRs: [first], seen: buildSeenKeys(stored) }), []);

  const again = pullRequest({ reviews: [{ state: 'CHANGES_REQUESTED', atDaysAgo: 1 }] });
  const planned = plan({ openPRs: [again], seen: buildSeenKeys(stored) });
  assert.equal(planned.length, 1);
  assert.equal(planned[0].type, 'pr_changes_requested');
});

test('a bot requesting changes does not notify', () => {
  const byBot = pullRequest({ reviews: [{ state: 'CHANGES_REQUESTED', author: { login: 'coderabbitai', __typename: 'Bot' } }] });
  const byBotLogin = pullRequest({ reviews: [{ state: 'CHANGES_REQUESTED', author: { login: 'renovate[bot]', __typename: 'User' } }] });
  assert.deepEqual(plan({ openPRs: [byBot, byBotLogin] }), []);
});

test('silence is not reported while the PR is waiting on the author', () => {
  const stale = { updatedDaysAgo: 40, committedDaysAgo: 60 };
  const cases = [
    pullRequest({ ...stale, ciState: 'FAILURE' }),
    pullRequest({ ...stale, number: 8, mergeable: 'CONFLICTING' }),
    pullRequest({ ...stale, number: 9, reviews: [{ state: 'CHANGES_REQUESTED' }] }),
  ];
  const planned = plan({ openPRs: cases });
  assert.equal(planned.length, 3);
  assert.ok(planned.every(p => p.type !== 'pr_silence'));
});

test("PRs to the viewer's own repositories are left out", () => {
  const own = pullRequest({ nameWithOwner: 'Stefan/dotfiles', ciState: 'FAILURE' });
  const ownMerged = { ...pullRequest({ nameWithOwner: 'stefan/site' }), mergedAt: ago(1) };
  assert.deepEqual(plan({ openPRs: [own], mergedPRs: [ownMerged], viewerLogin: 'stefan' }), []);
  assert.equal(plan({ openPRs: [own], viewerLogin: 'someone-else' }).length, 1);
});

test('merges from before the user joined are stored as read; later ones stay unread', () => {
  const trackingSince = Date.parse(ago(5));
  const before = { ...pullRequest({ number: 9 }), mergedAt: ago(10) };
  const after = { ...pullRequest({ number: 10 }), mergedAt: ago(1) };
  const rows = plan({ mergedPRs: [before, after], trackingSince }).map(item => toNotificationRow('42', item));
  assert.deepEqual(rows.map(r => [r.dedup_key.endsWith('/9'), r.is_read]), [[true, true], [false, false]]);
});

test('without a known join date nothing is marked read', () => {
  const merged = { ...pullRequest({ number: 9 }), mergedAt: ago(10) };
  assert.equal(toNotificationRow('42', plan({ mergedPRs: [merged] })[0]).is_read, false);
});

test('silence is reported again once the author pushed after the request', () => {
  const addressed = pullRequest({ reviews: [{ state: 'CHANGES_REQUESTED', atDaysAgo: 30 }], committedDaysAgo: 25, updatedDaysAgo: 25 });
  const types = plan({ openPRs: [addressed] }).map(p => p.type);
  assert.ok(types.includes('pr_silence'));
});

test('a PR idle for months is treated as abandoned, not as waiting', () => {
  assert.deepEqual(plan({ openPRs: [pullRequest({ updatedDaysAgo: 120 })] }), []);
});

test('an issue closed in another repository is not linked or attributed as this repo', () => {
  const pr = pullRequest({ updatedDaysAgo: 20 });
  pr.closingIssuesReferences = { nodes: [{ number: 12, repository: { nameWithOwner: 'other/repo' } }] };
  assert.equal(plan({ openPRs: [pr] })[0].link, '/explore/vercel/next.js?pr=7');
  const rows = [{ event_type: 'asked_to_work', owner: 'vercel', repo: 'next.js', issue_number: 12, created_at: ago(10) }];
  assert.deepEqual(planAttributedOutcomes({ openPRs: [pr], ...buildOutcomeKeys(rows) }), []);
});

const outcomeRow = (event_type, { issue_number = 42, daysAgo = 10, owner = 'Vercel', repo = 'Next.js' } = {}) =>
  ({ event_type, owner, repo, issue_number, created_at: ago(daysAgo) });
const attribute = ({ rows = [], openPRs = [], mergedPRs = [] }) =>
  planAttributedOutcomes({ openPRs, mergedPRs, ...buildOutcomeKeys(rows) });

test('a PR closing an issue the user acted on before opening it records pr_opened', () => {
  const planned = attribute({ rows: [outcomeRow('asked_to_work')], openPRs: [pullRequest({ issueNumber: 42 })] });
  assert.deepEqual(planned, [{ eventType: 'pr_opened', owner: 'vercel', repo: 'next.js', issueNumber: 42 }]);
});

test('opening the issue after the PR existed does not attribute the PR', () => {
  const pr = pullRequest({ issueNumber: 42, createdDaysAgo: 20 });
  assert.deepEqual(attribute({ rows: [outcomeRow('opened_issue', { daysAgo: 1 })], openPRs: [pr] }), []);
});

test('the earliest interaction decides, not the latest', () => {
  const pr = pullRequest({ issueNumber: 42, createdDaysAgo: 5 });
  const rows = [outcomeRow('opened_issue', { daysAgo: 1 }), outcomeRow('asked_to_work', { daysAgo: 8 })];
  assert.equal(attribute({ rows, openPRs: [pr] }).length, 1);
});

test('a PR for an issue the user never touched here, or closing no issue, is not attributed', () => {
  const rows = [outcomeRow('asked_to_work', { issue_number: 7 })];
  assert.deepEqual(attribute({ rows, openPRs: [pullRequest({ issueNumber: 42 }), pullRequest({ number: 8 })] }), []);
});

test('any closing issue can carry the attribution', () => {
  const pr = pullRequest({ issueNumbers: [5, 42] });
  const planned = attribute({ rows: [outcomeRow('explained_with_ai')], openPRs: [pr] });
  assert.deepEqual(planned.map(p => p.issueNumber), [42]);
});

test('an attributed merge records pr_opened and pr_merged once each', () => {
  const merged = { ...pullRequest({ issueNumber: 42 }), mergedAt: ago(1) };
  const rows = [outcomeRow('asked_to_work')];
  const first = attribute({ rows, openPRs: [merged], mergedPRs: [merged] });
  assert.deepEqual(first.map(p => p.eventType), ['pr_opened', 'pr_merged']);

  const recorded = first.map(p => ({ event_type: p.eventType, owner: p.owner, repo: p.repo, issue_number: p.issueNumber, created_at: ago(0) }));
  assert.deepEqual(attribute({ rows: [...rows, ...recorded], mergedPRs: [merged] }), []);
});

test('an unattributed merge records no outcome', () => {
  const merged = { ...pullRequest({ issueNumber: 42 }), mergedAt: ago(1) };
  assert.deepEqual(attribute({ mergedPRs: [merged] }), []);
});

test('recorded pr_ rows never count as acting on the issue', () => {
  const rows = [outcomeRow('pr_merged'), outcomeRow('pr_opened', { issue_number: 43 })];
  assert.deepEqual(attribute({ rows, openPRs: [pullRequest({ issueNumber: 42 })] }), []);
});

test('private repositories and the viewer\'s own repositories are never attributed', () => {
  const rows = [outcomeRow('asked_to_work')];
  assert.deepEqual(attribute({ rows, openPRs: [pullRequest({ issueNumber: 42, isPrivate: true })] }), []);
  const own = planAttributedOutcomes({ openPRs: [pullRequest({ issueNumber: 42 })], viewerLogin: 'vercel', ...buildOutcomeKeys(rows) });
  assert.deepEqual(own, []);
});

test('a reload soon after a sync does not sync again', () => {
  assert.equal(isCoolingDown(undefined, NOW), false);
  assert.equal(isCoolingDown(NOW - 60 * 1000, NOW), true);
  assert.equal(isCoolingDown(NOW - 4 * 60 * 1000, NOW), false);
});

const assignedIssue = (events, overrides = {}) => ({
  number: 482,
  title: 'Focus ring missing on icon-only buttons',
  url: 'https://github.com/lumen-ui/lumen/issues/482',
  repository: { nameWithOwner: 'lumen-ui/lumen' },
  timelineItems: { nodes: events },
  ...overrides,
});
const assigned = (daysAgo, actor, assignee = 'me') => ({
  createdAt: ago(daysAgo), actor: { login: actor }, assignee: { __typename: 'User', login: assignee },
});
const assignedPlan = (issues, overrides = {}) =>
  plan({ assignedIssues: issues, viewerLogin: 'Me', ...overrides }).filter(item => item.type === 'issue_assigned');

test('a maintainer assigning an issue to the viewer is a notification', () => {
  const [item] = assignedPlan([assignedIssue([assigned(1, 'maintainer')])]);
  assert.equal(item.title, 'You were assigned to lumen-ui/lumen#482');
  assert.equal(item.message, '"Focus ring missing on icon-only buttons", assigned by maintainer');
  assert.equal(item.link, '/explore/lumen-ui/lumen?issue=482');
  assert.equal(item.key, `issue_assigned:https://github.com/lumen-ui/lumen/issues/482:${ago(1)}`);
});

test('assigning yourself is not a notification', () => {
  assert.deepEqual(assignedPlan([assignedIssue([assigned(1, 'me')])]), []);
});

test('only the latest assignment to the viewer counts, not other assignees', () => {
  const [item] = assignedPlan([assignedIssue([assigned(20, 'maintainer'), assigned(2, 'maintainer'), assigned(1, 'maintainer', 'someone-else')])]);
  assert.equal(item.key.endsWith(ago(2)), true);
});

test('assignments older than the window or already seen are skipped', () => {
  assert.deepEqual(assignedPlan([assignedIssue([assigned(31, 'maintainer')])]), []);
  const key = `issue_assigned:https://github.com/lumen-ui/lumen/issues/482:${ago(1)}`;
  assert.deepEqual(assignedPlan([assignedIssue([assigned(1, 'maintainer')])], { seen: new Set([key]) }), []);
});

test('an assignment from before the user signed up arrives already read', () => {
  const trackingSince = Date.parse(ago(5));
  const [before, after] = assignedPlan([
    assignedIssue([assigned(10, 'maintainer')], { number: 1, url: 'https://github.com/lumen-ui/lumen/issues/1' }),
    assignedIssue([assigned(1, 'maintainer')], { number: 2, url: 'https://github.com/lumen-ui/lumen/issues/2' }),
  ], { trackingSince });
  assert.equal(before.read, true);
  assert.equal(after.read, false);
});

test('without a viewer login or an assignment event nothing is planned', () => {
  assert.deepEqual(assignedPlan([assignedIssue([assigned(1, 'maintainer')])], { viewerLogin: null }), []);
  assert.deepEqual(assignedPlan([assignedIssue([])]), []);
});

test('the cooldown is shorter than the five-minute poll, so a poll that arrives early still syncs', () => {
  const poll = 5 * 60 * 1000;
  assert.equal(isCoolingDown(NOW - (poll - 30 * 1000), NOW), false);
});

test('an assignment done by a bot does not name the bot as the one who assigned it', () => {
  const [item] = assignedPlan([assignedIssue([{ ...assigned(1, 'k8s-ci-robot'), actor: { login: 'k8s-ci-robot', __typename: 'Bot' } }])]);
  assert.equal(item.message, '"Focus ring missing on icon-only buttons"');
});
