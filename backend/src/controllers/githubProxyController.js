const axios = require('axios');
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
const proxy = async (req, res) => {
  const path = sanitizePath(req.params.path || '');
  if (!path) {
    return res.status(400).json({
      error: 'Invalid path'
    });
  }
  const route = ALLOWED_ROUTES.find(r => r.pattern.test(path));
  if (!route) {
    return res.status(403).json({
      error: 'This GitHub path is not allowed'
    });
  }
  const params = sanitizeQuery(route.params, req.query);
  if (!params) {
    return res.status(400).json({
      error: 'Invalid query parameters'
    });
  }
  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.github.com${path}`,
      params,
      headers: {
        Authorization: `Bearer ${req.user.accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'CodeQuest'
      }
    });
    FORWARDED_HEADERS.forEach(name => {
      const value = response.headers[name];
      if (value) res.set(name, value);
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response?.status === 304) {
      FORWARDED_HEADERS.forEach(name => {
        const value = error.response.headers[name];
        if (value) res.set(name, value);
      });
      return res.status(304).end();
    }
    if (error.response?.status === 401) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }
    console.error('GitHub proxy error:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    res.status(status).json({
      error: 'GitHub request failed'
    });
  }
};
module.exports = {
  proxy
};
