const axios = require('axios');
const { isRetryableStatus, getRetryDelayMs } = require('../utils/retry');
const API_BASE = 'https://api.github.com';

class GitHubService {
  static buildHeaders(token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CodeQuest',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  static async request(token, method, path, options = {}) {
    const headers = GitHubService.buildHeaders(token);
    if (options.contentType) {
      headers['Content-Type'] = options.contentType;
    }
    const isReadOnly = method === 'GET' || method === 'HEAD';
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
        if (options.fullResponse) return response;
        return response.data;
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        if (!isRetryableStatus(status) || attempt >= maxAttempts) break;
        const delayMs = getRetryDelayMs(error.response?.headers, attempt, { fallbackBaseMs: 1000, fallbackCapMs: 10000 });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw lastError;
  }

  static async validateToken(token) {
    const response = await GitHubService.request(token, 'GET', '/user', {
      fullResponse: true,
      timeout: 10000
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