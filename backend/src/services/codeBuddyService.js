const axios = require('axios');
const GitHubService = require('./githubService');

const SYSTEM_PROMPT = `You are Code Buddy, an AI assistant helping developers find beginner-friendly open source issues.
When suggesting issues, ALWAYS show at least 5 issues (or all available if fewer than 5) and format your response like this:

# 📚 Available Issues
1. **[Repository Name]**
   - Description: [Brief description]
   - Link: [URL]

2. **[Repository Name]**
   - Description: [Brief description]
   - Link: [URL]

(continue with remaining issues...)

Remember to:
1. ALWAYS show at least 5 issues when available
2. Use the exact URLs provided
3. Keep all details exactly as provided
4. Number each issue sequentially
5. If fewer than 5 issues are available, explain that there are limited issues at the moment
6. Do not skip any available issues`;

class CodeBuddyService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    this.apiKey = process.env.OPENAI_API_KEY;
    this.cache = new Map();
    
    // Clean cache every hour
    setInterval(() => {
      this.cache.clear();
    }, 60 * 60 * 1000);
  }

  async getGitHubIssues(token) {
    if (!token) {
      throw new Error('GitHub token is required');
    }

    try {
      // Simpler query to get more results
      const query = 'is:open is:issue language:javascript label:"good first issue"';
      const options = {
        sort: 'created',
        order: 'desc',
        per_page: 100
      };

      console.log('Fetching GitHub issues with query:', query);
      const data = await GitHubService.searchIssues(token, query, options);
      console.log('Total issues found:', data?.total_count);
      console.log('Items returned:', data?.items?.length);

      if (!data?.items || data.items.length === 0) {
        console.log('No items found in response');
        return [];
      }

      const formattedIssues = data.items
        .filter(item => item.body)
        .map(item => ({
          title: item.title,
          repo: item.repository_url.split('/').slice(-2).join('/'),
          description: item.body?.slice(0, 150) + '...',
          url: item.html_url,
          html_url: item.html_url,
          created_at: item.created_at,
          comments: item.comments
        }));

      console.log('Formatted issues count:', formattedIssues.length);
      return formattedIssues;

    } catch (error) {
      console.error('GitHub API Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      throw error;
    }
  }

  async getResponse(userMessage, context, previousMessages, token) {
    try {
      const issues = await this.getGitHubIssues(token);
      console.log('Issues retrieved:', issues.length);
      
      if (!issues || issues.length === 0) {
        return "I apologize, but I couldn't find any beginner-friendly issues at the moment. Please try again later.";
      }

      const issuesContext = issues.map((issue, i) => 
        `Issue ${i + 1}:
        Title: ${issue.title}
        Repository: ${issue.repo}
        URL: ${issue.html_url || issue.url}
        Description: ${issue.description || 'No description provided'}`
      ).join('\n\n');

      console.log('Number of issues in context:', issues.length);

      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `Here are the current available beginner issues:\n\n${issuesContext}` },
        ...previousMessages,
        { role: 'user', content: userMessage }
      ];

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages,
          temperature: 0.7,
          max_tokens: 1000,
          presence_penalty: 0.6,
          frequency_penalty: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API');
      }

      return response.data.choices[0].message.content;

    } catch (error) {
      console.error('Error in getResponse:', error);
      throw error;
    }
  }
}

module.exports = { CodeBuddyService };