const prTracker = require('../services/prTrackerService');
const { asyncHandler } = require('../utils/httpError');

exports.syncPrTracker = asyncHandler(async (req, res) => {
  await prTracker.sync(req.user.id, req.user.accessToken);
  res.status(204).end();
});
