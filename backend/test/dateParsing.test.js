const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSubmissionPeriod } = require('../src/services/hackathonService');

// Fixed "today" so results don't depend on when the suite runs.
const NOW = new Date('2026-09-26T12:00:00');

const parse = period => parseSubmissionPeriod(period, NOW);

test('a start without a year takes the end year (the bug that produced start > end)', () => {
  // Previously: "Jun 25" was in the past, so it became Jun 25, 2027 — after the end date.
  assert.deepEqual(parse('Jun 25 - Oct 27, 2026'), { startDate: 'Jun 25, 2026', endDate: 'Oct 27, 2026' });
});

test('an end with only day and year takes the start month', () => {
  assert.deepEqual(parse('Nov 01 - 30, 2026'), { startDate: 'Nov 1, 2026', endDate: 'Nov 30, 2026' });
});

test('a period crossing New Year puts the start in the previous year', () => {
  assert.deepEqual(parse('Dec 28 - Jan 05, 2027'), { startDate: 'Dec 28, 2026', endDate: 'Jan 5, 2027' });
});

test('fully specified periods are kept as given', () => {
  assert.deepEqual(parse('Dec 28, 2026 - Jan 05, 2027'), { startDate: 'Dec 28, 2026', endDate: 'Jan 5, 2027' });
});

test('with no year at all, an upcoming period stays this year', () => {
  assert.deepEqual(parse('Oct 10 - Nov 20'), { startDate: 'Oct 10, 2026', endDate: 'Nov 20, 2026' });
});

test('with no year at all, a finished period is read as next year', () => {
  assert.deepEqual(parse('Mar 01 - Mar 30'), { startDate: 'Mar 1, 2027', endDate: 'Mar 30, 2027' });
});

test('start is never after end for any supported format', () => {
  for (const p of ['Jun 25 - Oct 27, 2026', 'Nov 01 - 30, 2026', 'Dec 28 - Jan 05, 2027', 'Oct 10 - Nov 20', 'Mar 01 - Mar 30']) {
    const { startDate, endDate } = parse(p);
    assert.ok(new Date(startDate) <= new Date(endDate), p);
  }
});

test('missing or unrecognised input is returned unchanged, never thrown', () => {
  assert.deepEqual(parse(''), { startDate: '', endDate: '' });
  assert.deepEqual(parse(undefined), { startDate: '', endDate: '' });
  assert.deepEqual(parse('TBA'), { startDate: 'TBA', endDate: '' });
  assert.deepEqual(parse('Spring - Summer'), { startDate: 'Spring', endDate: 'Summer' });
});
