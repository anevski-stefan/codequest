const axios = require('axios');
const GitHubService = require('../services/githubService');
const { getAiKey } = require('../utils/aiKeyStore');
const { asyncHandler, sendError } = require('../utils/httpError');
const { isValidOwner, isValidRepo } = require('../utils/validateParams');
const logger = require('../utils/logger');

const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
const GEMINI_MODEL = process.env.EXPLAIN_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const MAX_FILE_CHARS = 5000;
const MAX_README_CHARS = 4000;
const MAX_PR_TITLE_COUNT = 8;

// File paths to probe for tech stack detection (first hit wins per category)
const TECH_STACK_FILES = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'Gemfile',
  'composer.json',
  'mix.exs',
  '.nvmrc',
  '.tool-versions',
];

const CONTRIBUTING_PATHS = ['CONTRIBUTING.md', 'CONTRIBUTING', '.github/CONTRIBUTING.md', 'docs/CONTRIBUTING.md'];

async function tryFetchFile(accessToken, owner, repo, path, maxChars = MAX_FILE_CHARS) {
  try {
    const data = await GitHubService.request(accessToken, 'GET', `/repos/${owner}/${repo}/contents/${path}`);
    if (data?.content && data.encoding === 'base64') {
      return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8').slice(0, maxChars);
    }
  } catch { /* not found */ }
  return null;
}

async function fetchFirstMatch(accessToken, owner, repo, paths, maxChars) {
  for (const path of paths) {
    const content = await tryFetchFile(accessToken, owner, repo, path, maxChars);
    if (content) return { path, content };
  }
  return null;
}

exports.onboardRepo = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;

  if (!isValidOwner(owner) || !isValidRepo(repo)) return sendError(res, 400, 'Invalid owner or repo');

  const aiKey = await getAiKey(req.user.id, 'gemini');
  if (!aiKey) {
    return sendError(res, 402, 'No Gemini key configured. Add your Gemini API key in Settings to use this feature.');
  }

  // Fetch everything in parallel
  const [
    readmeResult,
    contributingResult,
    treeResult,
    repoResult,
    mergedPRsResult,
    ...techFileResults
  ] = await Promise.allSettled([
    tryFetchFile(req.user.accessToken, owner, repo, 'README.md', MAX_README_CHARS)
      .then(c => c || tryFetchFile(req.user.accessToken, owner, repo, 'readme.md', MAX_README_CHARS)),
    fetchFirstMatch(req.user.accessToken, owner, repo, CONTRIBUTING_PATHS, MAX_FILE_CHARS),
    GitHubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/git/trees/HEAD`),
    GitHubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}`),
    GitHubService.request(req.user.accessToken, 'GET', `/repos/${owner}/${repo}/pulls`, {
      params: { state: 'closed', per_page: 20, sort: 'updated', direction: 'desc' },
    }),
    ...TECH_STACK_FILES.map(f => tryFetchFile(req.user.accessToken, owner, repo, f, 3000)),
  ]);

  const readme = readmeResult.status === 'fulfilled' ? readmeResult.value : null;
  const contributing = contributingResult.status === 'fulfilled' ? contributingResult.value : null;
  const tree = treeResult.status === 'fulfilled' ? treeResult.value : null;
  const repoMeta = repoResult.status === 'fulfilled' ? repoResult.value : null;
  const allPRs = mergedPRsResult.status === 'fulfilled' ? (mergedPRsResult.value ?? []) : [];
  const mergedPRs = Array.isArray(allPRs) ? allPRs.filter(pr => pr.merged_at) : [];

  // Build top-level directory listing from tree
  const topLevelEntries = (() => {
    if (!Array.isArray(tree?.tree)) return null;
    const entries = tree.tree
      .filter(e => !e.path.includes('/'))
      .map(e => `${e.type === 'tree' ? '📁' : '📄'} ${e.path}`)
      .slice(0, 40);
    return entries.join('\n');
  })();

  // Find first matched tech stack file
  const techFile = (() => {
    for (let i = 0; i < TECH_STACK_FILES.length; i++) {
      const r = techFileResults[i];
      if (r?.status === 'fulfilled' && r.value) {
        return { name: TECH_STACK_FILES[i], content: r.value };
      }
    }
    return null;
  })();

  // Build the prompt
  const sections = [];

  if (repoMeta) {
    sections.push(
      ...[
        `## Repository: ${repoMeta.full_name}`,
        repoMeta.description ? `Description: ${repoMeta.description}` : null,
        repoMeta.language ? `Primary language: ${repoMeta.language}` : null,
        `Stars: ${repoMeta.stargazers_count?.toLocaleString() ?? '?'} · Forks: ${repoMeta.forks_count ?? '?'}`,
        repoMeta.topics?.length ? `Topics: ${repoMeta.topics.join(', ')}` : null,
      ].filter(Boolean)
    );
  }

  if (readme) sections.push(`\n## README\n${readme}`);
  if (contributing) sections.push(`\n## CONTRIBUTING (${contributing.path})\n${contributing.content}`);
  if (topLevelEntries) sections.push(`\n## Top-level directory structure\n${topLevelEntries}`);
  if (techFile) sections.push(`\n## ${techFile.name}\n\`\`\`\n${techFile.content}\n\`\`\``);

  if (mergedPRs.length > 0) {
    const prList = mergedPRs
      .slice(0, MAX_PR_TITLE_COUNT)
      .map(pr => `- #${pr.number}: ${pr.title} (by ${pr.user?.login ?? 'unknown'})`)
      .join('\n');
    sections.push(`\n## Recently merged pull requests\n${prList}`);
  }

  const userPrompt = sections.join('\n');

  const systemInstruction = `You are helping a developer get up to speed on an open-source repository they want to contribute to.
Based on the repository data provided, produce a structured onboarding guide. Write in clear, friendly prose — like a senior contributor welcoming a new team member.

Use exactly these sections (all in markdown):

## 🛠 Tech Stack
What languages, frameworks, and key libraries this project uses. Be specific.

## 📁 Project Structure
Walk through the top-level folders and explain what each one is for. Focus on where the code lives, where tests live, and where configuration lives.

## 🚀 Getting Started
Step-by-step: how to fork, clone, install dependencies, and run the project locally. Include the exact commands if they appear in the README or package.json scripts. If not found, give a reasonable guess based on the tech stack.

## 🤝 How to Contribute
Summarise the contribution process from CONTRIBUTING.md. Include: how to find an issue, branch naming, commit style, PR checklist, and review process. If no CONTRIBUTING.md exists, give sensible defaults.

## ✅ What kinds of PRs get merged here
Based on the merged PRs and any contribution guidelines, describe what the maintainers accept and value. What makes a PR likely to be merged vs. rejected?

Be practical and direct. A developer reading this should be productive within minutes.`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const geminiRes = await axios.post(
      `${GEMINI_BASE_URL}/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`,
      {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      },
      {
        params: { key: aiKey, alt: 'sse' },
        responseType: 'stream',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    await new Promise((resolve, reject) => {
      let buffer = '';
      geminiRes.data.on('data', chunk => {
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
          } catch { /* skip malformed */ }
        }
      });
      geminiRes.data.on('end', resolve);
      geminiRes.data.on('error', reject);
    });

    res.write('data: [DONE]\n\n');
  } catch (err) {
    logger.error('[onboardRepo] Gemini error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.response?.data?.error?.message || err.message || 'Gemini error' })}\n\n`);
  }

  res.end();
});
