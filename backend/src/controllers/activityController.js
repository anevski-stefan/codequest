const githubService = require('../services/githubService');
const { asyncHandler, badRequest } = require('../utils/httpError');
const { isValidOwner, isValidRepo } = require('../utils/validateParams');
const { getSupabase } = require('../config/supabase');
const logger = require('../utils/logger');

const PAYLOAD_WHITELIST = new Set(['action', 'ref_type', 'commits']);

function trimPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const trimmed = {};
  for (const key of PAYLOAD_WHITELIST) {
    if (payload[key] !== undefined) {
      trimmed[key] = payload[key];
    }
  }
  return trimmed;
}

exports.getActivity = asyncHandler(async (req, res) => {
  const activities = (await githubService.request(req.user.accessToken, 'GET', '/user/events')).slice(0, 30).map(event => ({
    id: event.id,
    type: event.type,
    repo: event.repo.name,
    date: event.created_at,
    payload: trimPayload(event.payload)
  }));
  res.json(activities);
});

// Outcome events feed later ranking and let us measure whether the product
// helps people reach a merged PR. Only known events are stored.
const OUTCOME_EVENTS = new Set(['opened_issue', 'explained_with_ai', 'asked_to_work', 'checked_in', 'opened_prs']);

exports.trackOutcome = asyncHandler(async (req, res) => {
  const { event_type, owner, repo, issue_number } = req.body ?? {};
  if (!OUTCOME_EVENTS.has(event_type)) return badRequest(res, 'Unknown event_type');
  if (owner !== undefined && !isValidOwner(owner)) return badRequest(res, 'Invalid owner');
  if (repo !== undefined && !isValidRepo(repo)) return badRequest(res, 'Invalid repo');
  if (issue_number !== undefined && !(Number.isInteger(issue_number) && issue_number > 0)) {
    return badRequest(res, 'issue_number must be a positive integer');
  }

  const { error } = await getSupabase().from('outcomes').insert([{
    user_id: String(req.user.id),
    event_type,
    owner: owner ? owner.toLowerCase() : null,
    repo: repo ? repo.toLowerCase() : null,
    issue_number: issue_number ?? null,
  }]);
  // Tracking must never break the user's action; log and move on.
  if (error) logger.error('Failed to track outcome:', { message: error.message });
  res.status(204).end();
});
