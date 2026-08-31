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

const etagMiddleware = (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }
  const originalSend = res.send;
  res.send = function (body) {
    if (body != null) {
      if (!res.getHeader('ETag')) {
        res.setHeader('ETag', etag(body));
      }
      res.setHeader('Cache-Control', 'no-cache');
      const clientEtag = req.headers['if-none-match'];
      const serverEtag = res.getHeader('ETag');
      if (clientEtag && serverEtag && etagsMatch(clientEtag, serverEtag)) {
        res.status(304);
        return originalSend.call(this);
      }
    }
    return originalSend.call(this, body);
  };
  next();
};
module.exports = etagMiddleware;