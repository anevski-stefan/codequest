const axios = require('axios');
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
    const response = await axios({
      method,
      url: `${API_BASE}${path}`,
      params: options.params,
      data: options.data,
      headers
    });
    return response.data;
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
