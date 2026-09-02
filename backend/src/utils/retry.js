const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_RETRY_DELAY_MS = 60000;

function isRetryableStatus(status) {
  return RETRYABLE_STATUS.has(status);
}

function getRetryDelayMs(headers = {}, attempt, { fallbackBaseMs = 1000, fallbackCapMs = 5000 } = {}) {
  const retryAfter = headers['retry-after'] ?? headers['RetryAfter'];
  if (retryAfter !== undefined) {
    const seconds = parseInt(retryAfter, 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
    }
    const date = Date.parse(retryAfter);
    if (!isNaN(date)) {
      return Math.min(Math.max(0, date - Date.now()), MAX_RETRY_DELAY_MS);
    }
  }
  const reset = headers['x-ratelimit-reset'];
  if (reset !== undefined) {
    const seconds = parseInt(reset, 10);
    if (Number.isFinite(seconds)) {
      return Math.min(Math.max(0, seconds * 1000 - Date.now()), MAX_RETRY_DELAY_MS);
    }
  }
  return Math.min(fallbackBaseMs * 2 ** (attempt - 1), fallbackCapMs);
}

module.exports = {
  isRetryableStatus,
  getRetryDelayMs
};