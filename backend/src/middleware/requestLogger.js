const crypto = require('crypto');

module.exports = function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id']
    || crypto.randomBytes(8).toString('hex');
  req.id = requestId;
  res.set('X-Request-Id', requestId);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms id=${requestId}`
    );
  });
  next();
};
