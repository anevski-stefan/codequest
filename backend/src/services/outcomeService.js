const logger = require('../utils/logger');

const OUTCOME_EVENTS = new Set([
  'opened_issue',
  'explained_with_ai',
  'asked_to_work',
  'checked_in',
  'opened_prs',
]);

const SERVER_OUTCOME_EVENTS = new Set([...OUTCOME_EVENTS, 'pr_opened', 'pr_merged']);

async function recordOutcome(supabase, { userId, eventType, owner, repo, issueNumber = null }, { serverOnly = false } = {}) {
  const allowed = serverOnly ? SERVER_OUTCOME_EVENTS : OUTCOME_EVENTS;
  if (!allowed.has(eventType)) return false;
  const { error } = await supabase.from('outcomes').insert([{
    user_id: String(userId),
    event_type: eventType,
    owner: owner ? owner.toLowerCase() : null,
    repo: repo ? repo.toLowerCase() : null,
    issue_number: issueNumber,
  }]);
  if (error) {
    logger.error('Failed to track outcome:', { message: error.message });
    return false;
  }
  return true;
}

module.exports = { OUTCOME_EVENTS, SERVER_OUTCOME_EVENTS, recordOutcome };
