const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { OUTCOME_EVENTS, recordOutcome } = require('../src/services/outcomeService');

test('every event the frontend can send is accepted by the backend', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../../frontend/src/services/github.ts'),
    'utf8'
  );
  const union = source.match(/export type OutcomeEvent =([^;]+);/);
  assert.ok(union, 'OutcomeEvent union not found in frontend/src/services/github.ts');
  const frontendEvents = [...union[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
  assert.ok(frontendEvents.length > 0, 'OutcomeEvent union parsed to zero events');
  const missing = frontendEvents.filter(e => !OUTCOME_EVENTS.has(e));
  assert.deepEqual(missing, [], `backend rejects: ${missing.join(', ')}`);
});

const recordingSupabase = () => {
  const inserted = [];
  return {
    inserted,
    from: () => ({ insert: async rows => { inserted.push(...rows); return { error: null }; } }),
  };
};

test('a client cannot record pr_opened or pr_merged; the backend can', async () => {
  for (const eventType of ['pr_opened', 'pr_merged']) {
    const client = recordingSupabase();
    assert.equal(await recordOutcome(client, { userId: 1, eventType, owner: 'a', repo: 'b', issueNumber: 3 }), false);
    assert.deepEqual(client.inserted, []);

    const server = recordingSupabase();
    assert.equal(await recordOutcome(server, { userId: 1, eventType, owner: 'A', repo: 'B', issueNumber: 3 }, { serverOnly: true }), true);
    assert.deepEqual(server.inserted, [{ user_id: '1', event_type: eventType, owner: 'a', repo: 'b', issue_number: 3 }]);
  }
});
