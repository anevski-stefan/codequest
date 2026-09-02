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
  githubErrorResponse
};
