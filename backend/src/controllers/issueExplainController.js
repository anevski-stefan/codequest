const axios = require('axios');
const GitHubService = require('../services/githubService');
const { getAiKey } = require('../utils/aiKeyStore');
const { asyncHandler, sendError } = require('../utils/httpError');
const { isValidOwner, isValidRepo } = require('../utils/validateParams');
const logger = require('../utils/logger');

const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
const GEMINI_MODEL = process.env.EXPLAIN_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const MAX_FILE_CHARS = 3000;
const MAX_README_CHARS = 2000;
const MAX_FILES = 5;
const MAX_BODY_CHARS = 6000;

const SKIP_FILE_PATTERNS = [/\.d\.ts$/, /types?\.(ts|js)$/, /interfaces?\.(ts|js)$/, /\.lock$/, /\.snap$/, /\.min\.(js|css)$/, /\.map$/];

const searchBucket = { count: 0, resetAt: 0 };
const SEARCH_MAX_PER_MIN = 25;

function canSearch() {
  const now = Date.now();
  if (now > searchBucket.resetAt) {
    searchBucket.count = 0;
    searchBucket.resetAt = now + 60000;
  }
  if (searchBucket.count >= SEARCH_MAX_PER_MIN) return false;
  searchBucket.count++;
  return true;
}

function isSkippableFile(path) {
  return SKIP_FILE_PATTERNS.some(re => re.test(path));
}

function extractFilePaths(text) {
  if (!text) return [];
  const paths = new Set();
  const re = /`([a-zA-Z0-9_./-]+\/[a-zA-Z0-9_./-]+\.[a-zA-Z0-9]{1,10})(?::\d+)?`/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const p = m[1];
    if (!p.includes('..') && !p.startsWith('/') && p.length < 200) paths.add(p);
  }
  return [...paths].filter(p => !isSkippableFile(p)).slice(0, 3);
}

function extractKeywords(title) {
  const stopwords = new Set([
    'the','and','for','with','from','that','this','into','when','should','does','not',
    'are','was','has','have','add','fix','bug','feat','feature','error','issue','problem',
    'fail','fails','failed','missing','broken','support','allow','make','need','want',
    'using','getting','cannot','could','would','being','after','before','during','test',
  ]);
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w))
    .slice(0, 3);
}

async function fetchReadme(accessToken, owner, repo) {
  try {
    const data = await GitHubService.request(accessToken, 'GET', `/repos/${owner}/${repo}/readme`);
    if (data?.content && data.encoding === 'base64') {
      return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8').slice(0, MAX_README_CHARS);
    }
  } catch { /* skip */ }
  return null;
}

async function fetchFileContent(accessToken, owner, repo, filePath) {
  try {
    const data = await GitHubService.request(accessToken, 'GET', `/repos/${owner}/${repo}/contents/${filePath}`);
    if (data?.content && data.encoding === 'base64') {
      return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8').slice(0, MAX_FILE_CHARS);
    }
  } catch { /* skip */ }
  return null;
}

async function searchRelevantFiles(accessToken, owner, repo, keywords, excludePaths) {
  if (!keywords.length || !canSearch()) return [];
  try {
    const q = `${keywords.join(' ')} repo:${owner}/${repo}`;
    const result = await GitHubService.request(accessToken, 'GET', '/search/code', {
      params: { q, per_page: 10 },
      cacheTtlMs: 60 * 60 * 1000,
    });
    if (!Array.isArray(result?.items)) return [];
    return result.items
      .map(item => item.path)
      .filter(p => !excludePaths.has(p) && !p.includes('..') && p.length < 200 && !isSkippableFile(p))
      .slice(0, 3);
  } catch { return []; }
}

exports.explainIssue = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  const { issueTitle, issueBody, comments = [], repoLanguage, repoDescription } = req.body;

  if (!isValidOwner(owner) || !isValidRepo(repo)) return sendError(res, 400, 'Invalid owner or repo');
  if (!issueTitle) return sendError(res, 400, 'issueTitle is required');

  const aiKey = await getAiKey(req.user.id, 'gemini');
  if (!aiKey) {
    return sendError(res, 402, 'No Gemini key configured. Add your Gemini API key in Settings to use this feature.');
  }

  const backtickPaths = extractFilePaths(issueBody || '');
  const keywords = extractKeywords(issueTitle);

  const [readmeResult, ...backtickResults] = await Promise.allSettled([
    fetchReadme(req.user.accessToken, owner, repo),
    ...backtickPaths.map(p =>
      fetchFileContent(req.user.accessToken, owner, repo, p).then(c => c ? { path: p, content: c } : null)
    ),
  ]);

  const readme = readmeResult.status === 'fulfilled' ? readmeResult.value : null;
  const fetchedByBacktick = backtickResults
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);
  const fetchedPaths = new Set(fetchedByBacktick.map(f => f.path));

  const searchPaths = await searchRelevantFiles(req.user.accessToken, owner, repo, keywords, fetchedPaths);
  const searchResults = await Promise.allSettled(
    searchPaths.map(p =>
      fetchFileContent(req.user.accessToken, owner, repo, p).then(c => c ? { path: p, content: c } : null)
    )
  );
  const fetchedBySearch = searchResults
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);

  const allFiles = [...fetchedByBacktick, ...fetchedBySearch].slice(0, MAX_FILES);

  const bodyText = (issueBody || '').slice(0, MAX_BODY_CHARS);
  const commentsText = comments
    .slice(0, 6)
    .map(c => `**${c.user?.login || 'anonymous'}**: ${(c.body || '').slice(0, 600)}`)
    .join('\n\n');

  const userPrompt = [
    `## Repository: ${owner}/${repo}`,
    repoLanguage ? `Language: ${repoLanguage}` : null,
    repoDescription ? `Description: ${repoDescription}` : null,
    readme ? `\n## README (excerpt)\n${readme}` : null,
    '',
    `## Issue: ${issueTitle}`,
    '',
    bodyText || '(no description provided)',
    commentsText ? `\n## Discussion\n${commentsText}` : null,
    allFiles.length > 0
      ? '\n## Relevant Source Files\n' +
        allFiles.map(f => `### \`${f.path}\`\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const systemInstruction = `You are a senior software engineer helping a developer solve a GitHub issue.
Write for a human reader — use plain English to explain concepts, not raw code dumps.

Rules:
- NEVER reproduce TypeScript interfaces, type definitions, or import lists verbatim. Describe what they represent in plain English instead.
- NEVER paste large blocks of unmodified source code from the context. Only show code when it is the actual fix.
- DO write in clear, conversational paragraphs. A developer should be able to read your response without squinting.

Structure:

**What needs to be done** — one or two plain-English sentences describing the goal.

**Why it's happening** — explain the root cause in human terms. Mention specific files or function names where relevant, but describe what they do rather than pasting their contents.

**How to fix it** — numbered steps. For each step:
  - Describe what to do in a sentence
  - Then show only the new/changed code (not the surrounding unchanged code) in a fenced code block with the correct language tag
  - Keep code blocks focused — 5–30 lines is ideal

If a new file is needed, show its full content. If a test is needed, show the test.
Be practical. Imagine you are explaining this to a teammate over a code review.`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const geminiUrl = `${GEMINI_BASE_URL}/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`;
    const geminiRes = await axios.post(
      geminiUrl,
      {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      },
      {
        params: { key: aiKey, alt: 'sse' },
        responseType: 'stream',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    await new Promise((resolve, reject) => {
      let buffer = '';
      geminiRes.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
          } catch { /* skip malformed chunk */ }
        }
      });
      geminiRes.data.on('end', resolve);
      geminiRes.data.on('error', reject);
    });

    res.write('data: [DONE]\n\n');
  } catch (err) {
    logger.error('[explainIssue] Gemini error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.response?.data?.error?.message || err.message || 'Gemini service error' })}\n\n`);
  }

  res.end();
});
