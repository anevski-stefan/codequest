const axios = require('axios');
const crypto = require('crypto');
const { setupCache, buildMemoryStorage, buildKeyGenerator } = require('axios-cache-interceptor');
const { isRetryableStatus, getRetryDelayMs } = require('../utils/retry');

const API_BASE = 'https://api.github.com';
const CACHE_ENABLED = process.env.GITHUB_CACHE_ENABLED !== 'false';
const DEFAULT_TTL_MS = (() => {
  const raw = parseInt(process.env.GITHUB_CACHE_TTL_MS, 10);
  return Number.isInteger(raw) && raw >= 0 ? raw : 5 * 60 * 1000;
})();
const MAX_ENTRIES = (() => {
  const raw = parseInt(process.env.GITHUB_CACHE_MAX_ENTRIES, 10);
  return Number.isInteger(raw) && raw > 0 ? raw : 1000;
})();
const TOKEN_VALIDATION_TTL_MS = 10 * 60 * 1000;

const storage = buildMemoryStorage(false, 5 * 60 * 1000, MAX_ENTRIES);

const generateKey = buildKeyGenerator((config) => {
  const token = config.headers?.Authorization || '';
  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';
  const params = JSON.stringify(
    Object.fromEntries(
      Object.entries(config.params || {}).sort(([a], [b]) => a.localeCompare(b))
    )
  );
  return crypto.createHash('sha256')
    .update(method).update('\x00')
    .update(token).update('\x00')
    .update(url).update('\x00')
    .update(params)
    .digest('hex');
});

const http = setupCache(axios.create(), {
  storage,
  ttl: DEFAULT_TTL_MS,
  interpretHeader: false,
  generateKey,
});

class GitHubService {
  static buildHeaders(token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CodeQuest',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  static async request(token, method, path, options = {}) {
    const headers = { ...GitHubService.buildHeaders(token), ...options.headers };
    if (options.contentType) headers['Content-Type'] = options.contentType;

    const isReadOnly = method === 'GET' || method === 'HEAD';
    const ttlMs = options.cacheTtlMs ?? DEFAULT_TTL_MS;
    const cacheConfig = CACHE_ENABLED && isReadOnly && options.cache !== false
      ? { ttl: ttlMs }
      : false;

    const maxAttempts = 1 + (options.maxRetries ?? (isReadOnly ? 2 : 0));
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await http({
          method,
          url: `${API_BASE}${path}`,
          params: options.params,
          data: options.data,
          headers,
          timeout: options.timeout || 15000,
          cache: cacheConfig,
        });
        if (options.fullResponse) {
          return { status: response.status, data: response.data, headers: response.headers };
        }
        return response.data;
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        if (!isRetryableStatus(status) || attempt >= maxAttempts) break;
        const delayMs = getRetryDelayMs(error.response?.headers, attempt, { fallbackBaseMs: 1000, fallbackCapMs: 10000 });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw new (require('../utils/httpError').GitHubApiError)('GitHub API request failed', lastError);
  }

  static invalidate(token, path, params) {
    const key = generateKey({
      headers: { Authorization: `Bearer ${token}` },
      method: 'get',
      url: `${API_BASE}${path}`,
      params: params || {},
    });
    storage.remove(key).catch(() => {});
  }

  static async validateToken(token) {
    const response = await GitHubService.request(token, 'GET', '/user', {
      fullResponse: true,
      timeout: 10000,
      cacheTtlMs: TOKEN_VALIDATION_TTL_MS,
    });
    return response.status === 200;
  }

  static async searchIssues(token, query, options = {}) {
    return GitHubService.request(token, 'GET', '/search/issues', {
      params: {
        q: query,
        sort: options.sort || 'created',
        order: options.order || 'desc',
        per_page: options.per_page || 100,
      },
    });
  }
}

module.exports = GitHubService;
