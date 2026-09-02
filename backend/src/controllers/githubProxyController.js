const GitHubService = require('../services/githubService');
const logger = require('../utils/logger');
const supabaseService = require('../services/supabaseService');
const { githubErrorResponse } = require('../utils/githubError');
const { badRequest, forbidden, sendError, asyncHandler } = require('../utils/httpError');
const ALLOWED_ROUTES = [{
  pattern: /^\/search\/issues$/,
  params: ['q', 'sort', 'order', 'per_page', 'page']
}, {
  pattern: /^\/search\/repositories$/,
  params: ['q', 'sort', 'order', 'per_page', 'page']
}, {
  pattern: /^\/search\/users$/,
  params: ['q', 'sort', 'order', 'per_page', 'page']
}, {
  pattern: /^\/user$/,
  params: []
}, {
  pattern: /^\/user\/repos$/,
  params: ['sort', 'per_page', 'page']
}, {
  pattern: /^\/user\/starred$/,
  params: ['per_page']
}, {
  pattern: /^\/users\/[^/]+$/,
  params: []
}, {
  pattern: /^\/users\/[^/]+\/orgs$/,
  params: []
}, {
  pattern: /^\/users\/[^/]+\/starred$/,
  params: ['per_page']
}, {
  pattern: /^\/users\/[^/]+\/events\/public$/,
  params: []
}, {
  pattern: /^\/users\/[^/]+\/followers$/,
  params: ['per_page']
}, {
  pattern: /^\/users\/[^/]+\/following$/,
  params: ['per_page']
}, {
  pattern: /^\/users\/[^/]+\/repos$/,
  params: ['per_page']
}];
const FORWARDED_HEADERS = ['link', 'etag', 'last-modified', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'x-oauth-scopes', 'x-poll-interval'];
function sanitizePath(raw) {
  if (typeof raw !== 'string') return null;
  const p = '/' + raw.replace(/^\/+/, '');
  if (p.includes('..') || p.includes('%') || p.includes('\\')) return null;
  if (!/^[A-Za-z0-9\-/_]+$/.test(p)) return null;
  return p;
}
function sanitizeQuery(allowedKeys, reqQuery) {
  const result = {};
  for (const key of allowedKeys) {
    const value = reqQuery[key];
    if (value === undefined) continue;
    if (typeof value === 'string') {
      result[key] = value;
    } else if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
      result[key] = value;
    } else {
      return null;
    }
  }
  return result;
}

function forwardHeaders(response, res) {
  FORWARDED_HEADERS.forEach(name => {
    const value = response.headers[name];
    if (value) res.set(name, value);
  });
  return res;
}

const proxy = asyncHandler(async (req, res) => {
  const path = sanitizePath(req.params.path || '');
  if (!path) {
    return badRequest(res, 'Invalid path');
  }
  const route = ALLOWED_ROUTES.find(r => r.pattern.test(path));
  if (!route) {
    return forbidden(res, 'This GitHub path is not allowed');
  }
  const params = sanitizeQuery(route.params, req.query);
  if (!params) {
    return badRequest(res, 'Invalid query parameters');
  }
  try {
    const response = await GitHubService.request(req.user.accessToken, 'GET', path, {
      params,
      fullResponse: true
    });
    forwardHeaders(response, res);
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response?.status === 304) {
      const { headers, status } = error.response;
      return forwardHeaders({ headers }, res).status(status).end();
    }
    if (error.response?.status === 401) {
      if (req.user?.id) {
        supabaseService.invalidateAccessToken(req.user.id).catch(err => logger.error('Failed to invalidate token on GitHub 401:', err.message));
      }
      req.logout?.(() => {});
      return sendError(res, 401, 'Unauthorized');
    }
    logger.error('GitHub proxy error:', error.response?.data || error.message);
    return githubErrorResponse(res, error, 'GitHub request failed');
  }
});
module.exports = {
  proxy
};