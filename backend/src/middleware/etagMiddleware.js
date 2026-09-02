const etag = require('etag');

function normalizeETags(headerValue) {
  return headerValue
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function etagsMatch(clientEtag, serverEtag) {
  const serverTag = serverEtag.replace(/^W\//, '');
  return normalizeETags(clientEtag).some(tag => {
    const normalized = tag.replace(/^W\//, '');
    return normalized === serverTag || normalized === '*';
  });
}

function computeETag(body) {
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    return etag(body);
  }
  if (body && typeof body === 'object') {
    try {
      return etag(JSON.stringify(body));
    } catch {
      return null;
    }
  }
  return null;
}

const etagMiddleware = (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }
  const originalSend = res.send;
  res.send = function (body) {
    if (this.writableEnded) {
      return this;
    }
    if (body != null && !res.getHeader('ETag')) {
      const tag = computeETag(body);
      if (tag) {
        res.setHeader('ETag', tag);
        res.setHeader('Cache-Control', 'no-cache');
        const clientEtag = req.headers['if-none-match'];
        if (clientEtag && etagsMatch(clientEtag, tag)) {
          res.status(304);
          return originalSend.call(this);
        }
      }
    }
    return originalSend.call(this, body);
  };
  next();
};
module.exports = etagMiddleware;