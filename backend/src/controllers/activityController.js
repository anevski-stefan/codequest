const githubService = require('../services/githubService');
const logger = require('../utils/logger');
const { githubErrorResponse } = require('../utils/githubError');
const { asyncHandler } = require('../utils/httpError');

const PAYLOAD_WHITELIST = new Set(['action', 'ref_type']);

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
  try {
    const activities = (await githubService.request(req.user.accessToken, 'GET', '/user/events')).slice(0, 30).map(event => ({
      id: event.id,
      type: event.type,
      repo: event.repo.name,
      date: event.created_at,
      payload: trimPayload(event.payload)
    }));
    res.json(activities);
  } catch (error) {
    logger.error('Error fetching activity:', error.response?.data);
    return githubErrorResponse(res, error, 'Failed to fetch activity');
  }
});