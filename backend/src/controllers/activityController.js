const githubService = require('../services/githubService');
const logger = require('../utils/logger');

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

exports.getActivity = async (req, res) => {
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
    res.status(500).json({
      error: 'Failed to fetch activity'
    });
  }
};