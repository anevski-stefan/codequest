// Centralized error response format for the API.
// Canonical shape: { error: string, details?: unknown, code?: string }
// All controllers should send errors through these helpers so errors are
// consistent on the wire regardless of which controller produced them.
function errorBody(message, details, code) {
  const body = { error: message };
  if (details !== undefined) body.details = details;
  if (code !== undefined) body.code = code;
  return body;
}

function sendError(res, status, message, details, code) {
  return res.status(status).json(errorBody(message, details, code));
}

function badRequest(res, message, details, code) {
  return sendError(res, 400, message, details, code);
}

function forbidden(res, message) {
  return sendError(res, 403, message);
}

function notFound(res, message) {
  return sendError(res, 404, message);
}

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function devDetails(details) {
  return process.env.NODE_ENV !== 'production' ? details : undefined;
}

// GitHub signals rate limits with 403 as well as 429; a plain 403 is a permission error.
// GraphQL reports an exhausted budget as HTTP 200 with an error of type RATE_LIMITED.
function detectRateLimit(response, now = Date.now()) {
  if (!response) return null;
  const headers = response.headers || {};
  const message = String(response.data?.message || '');
  const graphqlLimited = response.status === 200
    && Array.isArray(response.data?.errors)
    && response.data.errors.some(e => e?.type === 'RATE_LIMITED');
  if (response.status !== 403 && response.status !== 429 && !graphqlLimited) return null;
  const secondary = /secondary rate limit/i.test(message);
  const exhausted = headers['x-ratelimit-remaining'] === '0';
  if (!secondary && !exhausted && !graphqlLimited && response.status !== 429) return null;

  const retryAfter = parseInt(headers['retry-after'], 10);
  const reset = parseInt(headers['x-ratelimit-reset'], 10);
  let retryAfterSeconds = 60;
  if (Number.isFinite(retryAfter) && retryAfter > 0) retryAfterSeconds = retryAfter;
  else if ((exhausted || graphqlLimited) && Number.isFinite(reset)) retryAfterSeconds = Math.max(1, Math.ceil(reset - now / 1000));

  let kind = 'unknown';
  if (exhausted || graphqlLimited) kind = 'primary';
  else if (secondary) kind = 'secondary';

  return {
    kind,
    resource: headers['x-ratelimit-resource'] || (graphqlLimited ? 'graphql' : null),
    githubStatus: response.status,
    remaining: headers['x-ratelimit-remaining'] ?? null,
    message: message || null,
    retryAfterSeconds
  };
}

function formatWait(seconds) {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

class GitHubApiError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'GitHubApiError';
    this.originalError = originalError;
    const githubStatus = originalError?.response?.status;
    this.status = githubStatus >= 400 ? githubStatus : 500;
    this.details = devDetails(originalError?.response?.data?.message);
    const rateLimit = detectRateLimit(originalError?.response);
    if (rateLimit) {
      this.status = 429;
      this.code = 'GITHUB_RATE_LIMIT';
      this.rateLimit = rateLimit;
      this.retryAfterSeconds = rateLimit.retryAfterSeconds;
      this.message = `GitHub is limiting requests from your account. Try again in ${formatWait(rateLimit.retryAfterSeconds)}.`;
    }
  }
}

function githubErrorResponse(res, error, fallbackMessage) {
  const status = error.response?.status || 500;
  const details = devDetails(error.response?.data?.message);
  return sendError(res, status, fallbackMessage || 'GitHub API request failed', details);
}

module.exports = {
  errorBody,
  sendError,
  badRequest,
  forbidden,
  notFound,
  HttpError,
  asyncHandler,
  devDetails,
  githubErrorResponse,
  detectRateLimit,
  formatWait,
  GitHubApiError
};
