const etag = require('etag');
const etagMiddleware = (req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    if (body) {
      const generatedEtag = etag(JSON.stringify(body));
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag && clientEtag === generatedEtag) {
        res.status(304).send();
        return;
      }
      res.setHeader('ETag', generatedEtag);
    }
    return originalSend.call(this, body);
  };
  next();
};
module.exports = etagMiddleware;