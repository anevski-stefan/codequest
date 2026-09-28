const axios = require('axios');
const crypto = require('crypto');
const { setupCache, buildMemoryStorage, buildKeyGenerator } = require('axios-cache-interceptor');
const { isRetryableStatus, getRetryDelayMs } = require('../utils/retry');
const { detectRateLimit } = require('../utils/httpError');

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
  const data = config.data ? JSON.stringify(config.data) : '';
  return crypto.createHash('sha256')
    .update(method).update('\x00')
    .update(token).update('\x00')
    .update(url).update('\x00')
    .update(params).update('\x00')
    .update(data)
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
    const isGraphQL = method === 'POST' && path === '/graphql';
    const ttlMs = options.cacheTtlMs ?? DEFAULT_TTL_MS;
    
    const cacheConfig = CACHE_ENABLED && (isReadOnly || (isGraphQL && options.cacheTtlMs)) && options.cache !== false
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
          responseType: options.responseType,
          maxContentLength: options.maxContentLength,
          cache: cacheConfig,
        });
        
        if (isGraphQL && response.data?.errors && !response.data?.data) {
          const graphqlError = new Error(`GraphQL Errors: ${response.data.errors.map(e => e.message).join(', ')}`);
          graphqlError.response = response;
          throw graphqlError;
        }

        if (options.fullResponse) {
          return { status: response.status, data: response.data, headers: response.headers };
        }
        return response.data;
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        if (!isRetryableStatus(status) || detectRateLimit(error.response) || attempt >= maxAttempts) break;
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

  static async getUserTopLanguages(token) {
    const query = `
      query UserLanguages {
        viewer {
          repositories(first: 50, orderBy: {field: PUSHED_AT, direction: DESC}, isFork: false) {
            nodes {
              primaryLanguage {
                name
              }
            }
          }
          starredRepositories(first: 50, orderBy: {field: STARRED_AT, direction: DESC}) {
            nodes {
              primaryLanguage {
                name
              }
            }
          }
        }
      }
    `;

    try {
      const result = await GitHubService.request(token, 'POST', '/graphql', {
        data: { query },
        cacheTtlMs: 24 * 60 * 60 * 1000,
      });
      const repos = result.data?.viewer?.repositories?.nodes || [];
      const starred = result.data?.viewer?.starredRepositories?.nodes || [];
      
      const counts = {};
      const addLang = (node) => {
        const lang = node?.primaryLanguage?.name;
        if (lang) {
          counts[lang] = (counts[lang] || 0) + 1;
        }
      };
      
      repos.forEach(addLang);
      starred.forEach(addLang);
      
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([lang]) => lang);
    } catch (error) {
      console.error('Error fetching user languages:', error);
      return [];
    }
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

exports.verifyReposAccess = async (token, repos) => {
  if (repos.length === 0) return [];
  // Batch up to 50 repos per GraphQL request
  const batchSize = 50;
  const accessible = new Set();
  
  for (let i = 0; i < repos.length; i += batchSize) {
    const batch = repos.slice(i, i + batchSize);
    const aliases = batch.map((r, idx) => `repo${idx}: repository(owner: "${r.owner}", name: "${r.repo}") { id }`).join('\n');
    const query = `query {\n${aliases}\n}`;
    try {
      const result = await exports.request(token, 'POST', '/graphql', { data: { query } });
      batch.forEach((r, idx) => {
        if (result.data?.[`repo${idx}`]) accessible.add(`${r.owner}/${r.repo}`.toLowerCase());
      });
    } catch (e) {
      // Ignore errors (e.g., totally invalid repos)
    }
  }
  return repos.filter(r => accessible.has(`${r.owner}/${r.repo}`.toLowerCase()));
};
