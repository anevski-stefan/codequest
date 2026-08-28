const etag = require('etag');
const etagMiddleware = (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }
  const originalSend = res.send;
  res.send = function (body) {
    if (body != null) {
      const generatedEtag = etag(body);
      res.setHeader('ETag', generatedEtag);
      res.setHeader('Cache-Control', 'no-cache');
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag && clientEtag === generatedEtag) {
        res.status(304);
        return originalSend.call(this);
      }
    }
    return originalSend.call(this, body);
  };
  next();
};
module.exports = etagMiddleware;