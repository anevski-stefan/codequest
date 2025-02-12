const etag = require('etag');

const etagMiddleware = (req, res, next) => {
  // Store the original send
  const originalSend = res.send;

  // Override res.send
  res.send = function (body) {
    // Only generate ETag if there's a body
    if (body) {
      // Generate ETag
      const generatedEtag = etag(JSON.stringify(body));
      
      // Check if client sent If-None-Match header
      const clientEtag = req.headers['if-none-match'];
      
      if (clientEtag && clientEtag === generatedEtag) {
        // Return 304 if ETags match
        res.status(304).send();
        return;
      }

      // Set ETag header
      res.setHeader('ETag', generatedEtag);
    }
    
    // Call original send
    return originalSend.call(this, body);
  };

  next();
};

module.exports = etagMiddleware; 