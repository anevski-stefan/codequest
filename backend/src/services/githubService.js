const axios = require('axios');

class GitHubService {
  static async searchIssues(token, query, options = {}) {
    const response = await axios.get(
      'https://api.github.com/search/issues',
      {
        params: {
          q: query,
          sort: options.sort || 'created',
          order: options.order || 'desc',
          per_page: options.per_page || 100
        },
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );
    return response.data;
  }
}

module.exports = GitHubService; 