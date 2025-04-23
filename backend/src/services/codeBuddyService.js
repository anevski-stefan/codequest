const axios = require('axios');
const GitHubService = require('./githubService');
const OpenAI = require('openai');

const SYSTEM_PROMPT = `You are Code Buddy, an AI assistant helping developers find beginner-friendly open source issues.
When suggesting issues, ALWAYS show at least 5 issues (or all available if fewer than 5) and format your response like this:

# 📚 Available Issues
1. **[Repository Name]**
   - Description: [Brief description]
   - Link: [Click here to view issue](URL)

2. **[Repository Name]**
   - Description: [Brief description]
   - Link: [Click here to view issue](URL)

(continue with remaining issues...)

Remember to:
1. ALWAYS show at least 5 issues when available
2. Use the exact URLs provided, but display them as "[Click here to view issue](URL)"
3. Keep all details exactly as provided
4. Number each issue sequentially
5. If fewer than 5 issues are available, explain that there are limited issues at the moment
6. Do not skip any available issues`;

class CodeBuddyService {
  constructor() {
    this.cache = new Map();
    
    // Clean cache every hour
    setInterval(() => {
      this.cache.clear();
    }, 60 * 60 * 1000);
  }

  async getGitHubIssues(token, language = 'javascript', difficulty = 'all') {
    if (!token) {
      throw new Error('GitHub token is required');
    }

    try {
      // Most basic query structure with proper URL encoding for each term
      const labels = [
        'good-first-issue',
        '"good first issue"',  // Quotes for multi-word labels
        'help-wanted',
        'beginner'
      ];

      const baseQuery = [
        'is:open',
        'is:issue',
        `language:${language.toLowerCase()}`,
        labels.map(label => `label:${label}`).join(' OR ')  // Using explicit OR operator
      ].filter(Boolean).join(' ');

      console.log('Attempting query:', baseQuery);
      const query = encodeURIComponent(baseQuery);
      
      const options = {
        sort: 'updated',
        order: 'desc',
        per_page: 100,
        state: 'open'
      };

      const data = await GitHubService.searchIssues(token, query, options);
      console.log('GitHub Response:', {
        total_count: data?.total_count,
        items_count: data?.items?.length,
        query_url: `https://api.github.com/search/issues?q=${query}`,
        rate_limit: data?.headers?.['x-ratelimit-remaining']
      });

      if (!data?.items || data.items.length === 0) {
        console.log('No results found. Trying basic query...');
        // Try the most basic possible query with just one label
        const basicQuery = encodeURIComponent('is:open is:issue label:"good first issue"');
        const basicData = await GitHubService.searchIssues(token, basicQuery, options);
        console.log('Basic Query Results:', {
          total_count: basicData?.total_count,
          items_count: basicData?.items?.length
        });
        return basicData?.items || [];
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

  async getResponse(userMessage, context, previousMessages, token, service, apiKey) {
    try {
      // Extract language and difficulty from context
      const language = context?.language || 'javascript';
      const difficulty = context?.difficulty || 'all';
      const issues = await this.getGitHubIssues(token, language, difficulty);
      
      if (!issues || issues.length === 0) {
        return "I apologize, but I couldn't find any matching issues at the moment. Please try again with different criteria.";
      }

      const issuesContext = issues.map((issue, i) => 
        `Issue ${i + 1}:
        Title: ${issue.title}
        Repository: ${issue.repo}
        URL: ${issue.html_url || issue.url}
        Description: ${issue.description || 'No description provided'}`
      ).join('\n\n');

      if (!service || !apiKey) {
        throw new Error(`${service?.toUpperCase() || 'AI'} service configuration is missing`);
      }

      if (service === 'chatgpt') {
        return await this.getChatGPTResponse(userMessage, issuesContext, previousMessages, apiKey);
      } else if (service === 'gemini') {
        return await this.getGeminiResponse(userMessage, issuesContext, previousMessages, apiKey);
      } else {
        throw new Error('Invalid AI service selected');
      }
    } catch (error) {
      console.error('Error in getResponse:', error);
      throw error;
    }
  }

  async getChatGPTResponse(userMessage, issuesContext, previousMessages, apiKey) {
    try {
      // Create OpenAI client instance with Azure configuration
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://models.inference.ai.azure.com',
        defaultHeaders: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      // Truncate the issues context to avoid token limit
      const truncatedIssuesContext = issuesContext.split('\n\n')
        .slice(0, 5)  // Only take first 5 issues
        .join('\n\n');

      // Limit previous messages to last 5
      const limitedPreviousMessages = previousMessages.slice(-5);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',  
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: `Here are some recent beginner issues:\n\n${truncatedIssuesContext}` },
          ...limitedPreviousMessages,
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 2048,  // Reduced from 4096
        top_p: 1
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Azure OpenAI error:', error);
      if (error.response?.status === 401) {
        throw new Error('Invalid Azure OpenAI API key');
      }
      if (error.response?.status === 413 || error.error?.code === 'tokens_limit_reached') {
        throw new Error('Message too long. Please try a shorter message or fewer previous messages.');
      }
      throw new Error(`Azure OpenAI error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getGeminiResponse(userMessage, issuesContext, previousMessages, apiKey) {
    try {
      const formattedMessages = previousMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        {
          contents: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            { role: 'user', parts: [{ text: `Here are the current available beginner issues:\n\n${issuesContext}` }] },
            ...formattedMessages,
            { role: 'user', parts: [{ text: userMessage }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          params: {
            key: apiKey
          }
        }
      );

      if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from Gemini API');
      }

      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        throw new Error('Invalid Gemini API key');
      }
      throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

module.exports = { CodeBuddyService };