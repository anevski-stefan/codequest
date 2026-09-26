const axios = require('axios');
const { getAiKey } = require('../utils/aiKeyStore');
const logger = require('../utils/logger');

/**
 * One place for every AI call: provider resolution (Gemini / OpenAI),
 * streaming, model fallback and user-facing error messages.
 * Provider ids match the `service` column in the ai_keys table.
 */

const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
const GEMINI_MODEL = process.env.EXPLAIN_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const OPENAI_FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini';

const PROVIDERS = ['gemini', 'chatgpt'];
const LABELS = { gemini: 'Gemini', chatgpt: 'OpenAI' };

const isProvider = value => PROVIDERS.includes(value);

/** Preferred provider first, then the other, so a user with one key always works. */
function providerOrder(preferred) {
  return isProvider(preferred) ? [preferred, ...PROVIDERS.filter(p => p !== preferred)] : [...PROVIDERS];
}

async function resolveProvider(userId, preferred) {
  for (const provider of providerOrder(preferred)) {
    const key = await getAiKey(userId, provider);
    if (key) return { provider, key };
  }
  return null;
}

/**
 * Splits an SSE byte stream into `data:` payloads. Returns the unconsumed
 * tail so partial lines survive across chunks.
 */
function consumeSseLines(buffer, onData) {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const raw = line.slice(6).trim();
    if (raw) onData(raw);
  }
  return rest;
}

const geminiText = raw => {
  try { return JSON.parse(raw).candidates?.[0]?.content?.parts?.[0]?.text ?? null; } catch { return null; }
};

const openaiText = raw => {
  if (raw === '[DONE]') return null;
  try { return JSON.parse(raw).choices?.[0]?.delta?.content ?? null; } catch { return null; }
};

function pipeSse(stream, extract, onChunk) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    stream.on('data', chunk => {
      buffer = consumeSseLines(buffer + chunk.toString(), raw => {
        const text = extract(raw);
        if (text) onChunk(text);
      });
    });
    stream.on('end', resolve);
    stream.on('error', reject);
  });
}

async function streamGemini({ model, key, system, prompt, temperature, maxTokens, onChunk }) {
  const res = await axios.post(
    `${GEMINI_BASE_URL}/v1beta/models/${model}:streamGenerateContent`,
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    },
    { params: { key, alt: 'sse' }, responseType: 'stream', headers: { 'Content-Type': 'application/json' } },
  );
  await pipeSse(res.data, geminiText, onChunk);
}

async function streamOpenAI({ model, key, system, prompt, temperature, maxTokens, onChunk }) {
  const res = await axios.post(
    `${OPENAI_BASE_URL}/v1/chat/completions`,
    {
      model,
      stream: true,
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    },
    { responseType: 'stream', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` } },
  );
  await pipeSse(res.data, openaiText, onChunk);
}

const STREAMERS = {
  gemini: { stream: streamGemini, model: GEMINI_MODEL, fallback: GEMINI_FALLBACK_MODEL },
  chatgpt: { stream: streamOpenAI, model: OPENAI_MODEL, fallback: OPENAI_FALLBACK_MODEL },
};

/** Streams a completion; retries once on a lighter model when the primary is overloaded. */
async function streamCompletion({ provider, key, system, prompt, temperature = 0.2, maxTokens = 4096, onChunk, tag = 'ai' }) {
  const { stream, model, fallback } = STREAMERS[provider];
  const args = { key, system, prompt, temperature, maxTokens, onChunk };
  try {
    await stream({ ...args, model });
  } catch (err) {
    const status = err.response?.status;
    if ((status === 503 || status === 429) && fallback && fallback !== model) {
      logger.warn(`[${tag}] ${model} unavailable (${status}), retrying with ${fallback}`);
      await stream({ ...args, model: fallback });
      return;
    }
    throw err;
  }
}

/** Provider error bodies arrive as streams; read them so the real message reaches the user. */
async function readStreamError(err) {
  const data = err.response?.data;
  if (data && typeof data.on === 'function') {
    try {
      const chunks = [];
      await new Promise(resolve => {
        data.on('data', c => chunks.push(c));
        data.on('end', resolve);
        data.on('error', resolve);
      });
      return JSON.parse(Buffer.concat(chunks).toString())?.error?.message ?? null;
    } catch { return null; }
  }
  return data?.error?.message ?? null;
}

function friendlyError(status, providerMessage, err, provider) {
  const label = LABELS[provider] ?? 'AI';
  if (status === 401 || status === 403) return `Your ${label} API key was rejected. Check it in Settings.`;
  if (status === 429 || status === 503) return providerMessage || `${label} is busy right now. Try again in a moment.`;
  if (status === 400) return providerMessage || `${label} rejected the request. Your API key may be invalid.`;
  if (providerMessage) return providerMessage;
  if (err.message?.startsWith('Request failed with status code')) return `${label} error (HTTP ${status ?? 'unknown'}). Try again.`;
  return err.message || 'AI service error. Try again.';
}

const NO_KEY_MESSAGE = 'No AI key configured. Add a Gemini or OpenAI key in Settings to use this feature.';

/**
 * Streams an AI answer to the client as SSE (`data: {text}` … `data: [DONE]`).
 * Callers must have resolved a provider first so a 402 can still be sent
 * before the event-stream headers go out.
 */
async function streamToResponse(res, { ai, system, prompt, temperature, maxTokens, tag, onComplete }) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let full = '';
  const onChunk = text => {
    full += text;
    res.write(`data: ${JSON.stringify({ text })}\n\n`);
  };

  try {
    await streamCompletion({ provider: ai.provider, key: ai.key, system, prompt, temperature, maxTokens, onChunk, tag });
    res.write('data: [DONE]\n\n');
    if (onComplete && full) {
      Promise.resolve(onComplete(full, ai.provider)).catch(e => logger.error(`[${tag}] onComplete failed:`, e));
    }
  } catch (err) {
    const status = err.response?.status;
    const providerMessage = await readStreamError(err);
    logger.error(`[${tag}] ${ai.provider} error:`, { status, message: err.message, providerMessage });
    res.write(`data: ${JSON.stringify({ error: friendlyError(status, providerMessage, err, ai.provider) })}\n\n`);
  }
  res.end();
}

module.exports = {
  PROVIDERS,
  NO_KEY_MESSAGE,
  isProvider,
  providerOrder,
  resolveProvider,
  consumeSseLines,
  geminiText,
  openaiText,
  friendlyError,
  streamCompletion,
  streamToResponse,
};
