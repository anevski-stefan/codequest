const githubService = require('../services/githubService');
const { asyncHandler, badRequest } = require('../utils/httpError');
const { isValidOwner, isValidRepo } = require('../utils/validateParams');
const { getSupabase } = require('../config/supabase');
const { OUTCOME_EVENTS, recordOutcome } = require('../services/outcomeService');

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

exports.trackOutcome = asyncHandler(async (req, res) => {
  const { event_type, owner, repo, issue_number } = req.body ?? {};
  if (!OUTCOME_EVENTS.has(event_type)) return badRequest(res, 'Unknown event_type');
  if (owner !== undefined && !isValidOwner(owner)) return badRequest(res, 'Invalid owner');
  if (repo !== undefined && !isValidRepo(repo)) return badRequest(res, 'Invalid repo');
  if (issue_number !== undefined && !(Number.isInteger(issue_number) && issue_number > 0)) {
    return badRequest(res, 'issue_number must be a positive integer');
  }

  await recordOutcome(getSupabase(), {
    userId: req.user.id,
    eventType: event_type,
    owner,
    repo,
    issueNumber: issue_number ?? null,
  });
  res.status(204).end();
});
