const axios = require('axios');
const ALLOWED_PATHS = [/^\/search\/issues$/, /^\/search\/repositories$/, /^\/search\/users$/, /^\/user$/, /^\/user\/repos$/, /^\/user\/starred$/, /^\/users\/[^/]+$/, /^\/users\/[^/]+\/orgs$/, /^\/users\/[^/]+\/starred$/, /^\/users\/[^/]+\/events\/public$/, /^\/users\/[^/]+\/followers$/, /^\/users\/[^/]+\/following$/, /^\/users\/[^/]+\/repos$/];
const FORWARDED_HEADERS = ['link', 'etag', 'last-modified', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'x-oauth-scopes', 'x-poll-interval'];
const proxy = async (req, res) => {
  const path = '/' + (req.params.path || '').replace(/^\/+/, '');
  if (!ALLOWED_PATHS.some(re => re.test(path))) {
    return res.status(403).json({
      error: 'This GitHub path is not allowed'
    });
  }
  try {
    const response = await axios({
      method: 'GET',
      url: `https://api.github.com${path}`,
      params: req.query,
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
    const message = error.response?.data?.message || 'GitHub request failed';
    res.status(status).json({
      error: message
    });
  }
};
module.exports = {
  proxy
};