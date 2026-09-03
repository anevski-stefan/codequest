const axios = require('axios');
const crypto = require('crypto');
const { isRetryableStatus, getRetryDelayMs } = require('../utils/retry');
const { createCache } = require('../utils/githubCache');
const API_BASE = 'https://api.github.com';

const CACHE_ENABLED = process.env.GITHUB_CACHE_ENABLED !== 'false';
const DEFAULT_TTL_MS = (() => {
  const raw = parseInt(process.env.GITHUB_CACHE_TTL_MS, 10);
  return Number.isInteger(raw) && raw >= 0 ? raw : 60 * 1000;
})();
const MAX_ENTRIES = (() => {
  const raw = parseInt(process.env.GITHUB_CACHE_MAX_ENTRIES, 10);
  return Number.isInteger(raw) && raw > 0 ? raw : 500;
})();

const VALIDATION_HEADERS = ['link', 'etag', 'last-modified', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'x-oauth-scopes', 'x-poll-interval'];
const STORED_HEADERS = [...VALIDATION_HEADERS, 'cache-control'];

const cache = createCache({ maxEntries: MAX_ENTRIES });
cache.setEnabled(CACHE_ENABLED);

class GitHubService {
  static buildHeaders(token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CodeQuest',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  static cacheKey(token, method, path, params) {
    const digest = crypto.createHash('sha256');
    digest.update(method).update('\x00').update(token).update('\x00').update(path).update('\x00');
    digest.update(JSON.stringify(sortParams(params)));
    return digest.digest('hex');
  }

  static isCacheable(response) {
    if (!response || response.status < 200 || response.status >= 300) return false;
    const cc = (response.headers && response.headers['cache-control']) || '';
    if (/no-store|no-cache/i.test(cc)) return false;
    return true;
  }

  static pickHeaders(headers) {
    const result = {};
    for (const name of STORED_HEADERS) {
      const value = headers && headers[name];
      if (value !== undefined) result[name] = value;
    }
    return result;
  }

  static async request(token, method, path, options = {}) {
    const headers = GitHubService.buildHeaders(token);
    if (options.contentType) {
      headers['Content-Type'] = options.contentType;
    }
    const isReadOnly = method === 'GET' || method === 'HEAD';
    const shouldCache = isReadOnly && options.cache !== false;
    const ttlMs = options.cacheTtlMs ?? DEFAULT_TTL_MS;
    const key = GitHubService.cacheKey(token, method, path, options.params);
    let staleEntry = null;

    if (shouldCache && ttlMs > 0) {
      const cached = cache.get(key, { keepAliveMs: 0 });
      if (cached) {
        return GitHubService.toCaller(cached, options.fullResponse);
      }
      staleEntry = cache.getStale(key);
      if (staleEntry) {
        const etag = staleEntry.headers && staleEntry.headers.etag;
        const lastModified = staleEntry.headers && staleEntry.headers['last-modified'];
        if (etag) headers['If-None-Match'] = etag;
        if (lastModified) headers['If-Modified-Since'] = lastModified;
      }
    }

    const maxAttempts = 1 + (options.maxRetries ?? (isReadOnly ? 2 : 0));
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios({
          method,
          url: `${API_BASE}${path}`,
          params: options.params,
          data: options.data,
          headers,
          timeout: options.timeout || 15000
        });
        if (response.status === 304) {
          if (staleEntry) {
            cache.setFresh(key, staleEntry, ttlMs);
            return GitHubService.toCaller(staleEntry, options.fullResponse);
          }
          throw new (require('../utils/httpError').GitHubApiError)('GitHub returned 304 with no cached body', response);
        }
        if (shouldCache && GitHubService.isCacheable(response)) {
          const stored = {
            status: response.status,
            data: response.data,
            headers: GitHubService.pickHeaders(response.headers)
          };
          cache.set(key, stored, ttlMs);
        }
        if (options.fullResponse) {
          return {
            status: response.status,
            data: response.data,
            headers: response.headers
          };
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

  static toCaller(stored, fullResponse) {
    if (fullResponse) {
      return {
        status: stored.status,
        data: stored.data,
        headers: stored.headers
      };
    }
    return stored.data;
  }

  static async validateToken(token) {
    const response = await GitHubService.request(token, 'GET', '/user', {
      fullResponse: true,
      timeout: 10000,
      cache: false
    });
    return response.status === 200;
  }

  static async searchIssues(token, query, options = {}) {
    return GitHubService.request(token, 'GET', '/search/issues', {
      params: {
        q: query,
        sort: options.sort || 'created',
        order: options.order || 'desc',
        per_page: options.per_page || 100
      }
    });
  }
}
module.exports = GitHubService;

function sortParams(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};
  const sorted = {};
  for (const key of Object.keys(params).sort()) {
    sorted[key] = params[key];
  }
  return sorted;
}
