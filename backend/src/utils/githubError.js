// Returns a sanitized error response for GitHub API failures.
// Preserves the upstream HTTP status so clients can react (404, 403, 422, 401...),
// but does NOT forward GitHub's raw error message to avoid leaking implementation
// details. Technical detail is included only outside production.
function githubErrorResponse(res, error, fallbackMessage) {
  const status = error.response?.status || 500;
  const sensitive = process.env.NODE_ENV !== 'production';
  return res.status(status).json({
    error: fallbackMessage || 'GitHub API request failed',
    ...(sensitive && error.response?.data?.message ? {
      details: error.response.data.message
    } : {})
  });
}

module.exports = {
  githubErrorResponse
};
