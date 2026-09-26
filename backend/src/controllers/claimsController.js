const { getClaims } = require('../services/claimService');
const { asyncHandler, badRequest } = require('../utils/httpError');
const { isValidOwner, isValidRepo } = require('../utils/validateParams');

const MAX_ISSUES = 50;

// POST /api/issues/claims  { issues: [{ owner, repo, number }] }
exports.getIssueClaims = asyncHandler(async (req, res) => {
  const { issues } = req.body ?? {};
  if (!Array.isArray(issues) || issues.length === 0) return badRequest(res, 'issues must be a non-empty array');
  if (issues.length > MAX_ISSUES) return badRequest(res, `At most ${MAX_ISSUES} issues per request`);

  const valid = issues.every(it =>
    it && isValidOwner(it.owner) && isValidRepo(it.repo) && Number.isInteger(it.number) && it.number > 0);
  if (!valid) return badRequest(res, 'Each issue needs a valid owner, repo and positive integer number');

  const claims = await getClaims(req.user.accessToken, issues);
  res.json({ claims });
});
