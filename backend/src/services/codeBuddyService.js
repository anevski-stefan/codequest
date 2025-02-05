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

  async getResponse(userMessage, context, previousMessages, token, service, apiKey) {
    try {
      const issues = await this.getGitHubIssues(token);
      
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

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',  // Changed from gpt-4 to gpt-4o
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: `Here are the current available beginner issues:\n\n${issuesContext}` },
          ...previousMessages,
          { role: 'user', content: userMessage }
        ],
        temperature: 1,  // Match your configuration
        max_tokens: 4096,  // Match your configuration
        top_p: 1  // Match your configuration
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Azure OpenAI error:', error);
      if (error.response?.status === 401) {
        throw new Error('Invalid Azure OpenAI API key');
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