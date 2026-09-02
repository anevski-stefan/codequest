const axios = require('axios');
const GitHubService = require('./githubService');
const OpenAI = require('openai');
const logger = require('../utils/logger');
const DEFAULT_GITHUB_LABELS = 'good-first-issue,"good first issue",help-wanted,beginner';
const MAX_PREVIOUS_MESSAGES = 5;
const MAX_MESSAGE_CHARS = 4000;
const ALLOWED_LANGUAGES = new Set(['javascript', 'typescript', 'python', 'java', 'c', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'dart', 'elixir', 'haskell', 'shell', 'html', 'css']);
const safeLanguage = value => {
  if (typeof value !== 'string') return 'javascript';
  const normalized = value.trim().toLowerCase();
  return ALLOWED_LANGUAGES.has(normalized) ? normalized : 'javascript';
};
const sanitizeMessages = (messages) => {
  if (!Array.isArray(messages)) return [];
  const result = [];
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') continue;
    const role = msg.role === 'assistant' ? 'assistant' : msg.role === 'user' ? 'user' : null;
    if (!role) continue;
    const content = typeof msg.content === 'string' ? msg.content.trim() : '';
    if (!content) continue;
    result.push({
      role,
      content: content.slice(0, MAX_MESSAGE_CHARS)
    });
    if (result.length >= MAX_PREVIOUS_MESSAGES) break;
  }
  return result;
};
const toLabelList = value => value
  .split(',')
  .map(l => l.trim())
  .filter(Boolean);
const getAIConfig = () => ({
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://models.inference.ai.azure.com',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-pro',
  geminiBaseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com',
  temperature: Number(process.env.AI_TEMPERATURE || 0.7),
  chatgptMaxTokens: Number(process.env.CHATGPT_MAX_TOKENS || 2048),
  geminiMaxTokens: Number(process.env.GEMINI_MAX_TOKENS || 1000),
  githubLabels: toLabelList(process.env.GITHUB_ISSUE_LABELS || DEFAULT_GITHUB_LABELS)
});
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
  constructor() {}
  async getGitHubIssues(token, language = 'javascript', difficulty = 'all') {
    if (!token) {
      throw new Error('GitHub token is required');
    }
    try {
      const safeLang = safeLanguage(language);
      const labels = getAIConfig().githubLabels;
      const baseQuery = ['is:open', 'is:issue', `language:${safeLang}`, labels.map(label => `label:${label}`).join(' OR ')].filter(Boolean).join(' ');
      const query = encodeURIComponent(baseQuery);
      const options = {
        sort: 'updated',
        order: 'desc',
        per_page: 100,
        state: 'open'
      };
      const data = await GitHubService.searchIssues(token, query, options);
      if (!data?.items || data.items.length === 0) {
        const basicQuery = encodeURIComponent('is:open is:issue label:"good first issue"');
        const basicData = await GitHubService.searchIssues(token, basicQuery, options);
        return basicData?.items || [];
      }
      const formattedIssues = data.items.filter(item => item.body).map(item => ({
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
      logger.error('GitHub API Error:', {
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
      const safeUserMessage = typeof userMessage === 'string' ? userMessage.trim().slice(0, MAX_MESSAGE_CHARS) : '';
      if (!safeUserMessage) {
        throw new Error('Message is required');
      }
      const safePreviousMessages = sanitizeMessages(previousMessages);
      const language = safeLanguage(context?.language);
      const difficulty = typeof context?.difficulty === 'string' ? context.difficulty : 'all';
      const issues = await this.getGitHubIssues(token, language, difficulty);
      if (!issues || issues.length === 0) {
        return "I apologize, but I couldn't find any matching issues at the moment. Please try again with different criteria.";
      }
      const issuesContext = issues.map((issue, i) => `Issue ${i + 1}:
        Title: ${issue.title}
        Repository: ${issue.repo}
        URL: ${issue.html_url || issue.url}
        Description: ${issue.description || 'No description provided'}`).join('\n\n');
      if (!service || !apiKey) {
        throw new Error(`${service?.toUpperCase() || 'AI'} service configuration is missing`);
      }
      if (service === 'chatgpt') {
        return await this.getChatGPTResponse(safeUserMessage, issuesContext, safePreviousMessages, apiKey);
      } else if (service === 'gemini') {
        return await this.getGeminiResponse(safeUserMessage, issuesContext, safePreviousMessages, apiKey);
      } else {
        throw new Error('Invalid AI service selected');
      }
    } catch (error) {
      logger.error('Error in getResponse:', error);
      throw error;
    }
  }
  async getChatGPTResponse(userMessage, issuesContext, previousMessages, apiKey) {
    try {
      const config = getAIConfig();
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: config.openaiBaseUrl,
        defaultHeaders: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      const truncatedIssuesContext = issuesContext.split('\n\n').slice(0, 5).join('\n\n');
      const response = await openai.chat.completions.create({
        model: config.openaiModel,
        messages: [{
          role: 'system',
          content: SYSTEM_PROMPT
        }, {
          role: 'system',
          content: `Here are some recent beginner issues:\n\n${truncatedIssuesContext}`
        }, ...previousMessages, {
          role: 'user',
          content: userMessage
        }],
        temperature: config.temperature,
        max_tokens: config.chatgptMaxTokens,
        top_p: 1
      });
      return response.choices[0].message.content;
    } catch (error) {
      logger.error('Azure OpenAI error:', error);
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
      const config = getAIConfig();
      const geminiUrl = `${config.geminiBaseUrl}/v1beta/models/${config.geminiModel}:generateContent`;
      const formattedMessages = previousMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{
          text: msg.content
        }]
      }));
      const response = await axios.post(geminiUrl, {
        contents: [{
          role: 'user',
          parts: [{
            text: SYSTEM_PROMPT
          }]
        }, {
          role: 'user',
          parts: [{
            text: `Here are the current available beginner issues:\n\n${issuesContext}`
          }]
        }, ...formattedMessages, {
          role: 'user',
          parts: [{
            text: userMessage
          }]
        }],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.geminiMaxTokens
        }
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          key: apiKey
        }
      });
      if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from Gemini API');
      }
      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      logger.error('Gemini API error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        throw new Error('Invalid Gemini API key');
      }
      throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}
module.exports = {
  CodeBuddyService
};