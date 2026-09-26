const test = require('node:test');
const assert = require('node:assert/strict');
const {
  providerOrder, consumeSseLines, geminiText, openaiText, friendlyError,
} = require('../src/services/aiService');

test('providerOrder puts the preferred provider first', () => {
  assert.deepEqual(providerOrder('chatgpt'), ['chatgpt', 'gemini']);
  assert.deepEqual(providerOrder('gemini'), ['gemini', 'chatgpt']);
});

test('providerOrder ignores unknown preferences', () => {
  assert.deepEqual(providerOrder('claude'), ['gemini', 'chatgpt']);
  assert.deepEqual(providerOrder(undefined), ['gemini', 'chatgpt']);
});

test('consumeSseLines emits complete data lines and keeps the partial tail', () => {
  const seen = [];
  const rest = consumeSseLines('data: one\n\ndata: two\nevent: x\ndata: thr', raw => seen.push(raw));
  assert.deepEqual(seen, ['one', 'two']);
  assert.equal(rest, 'data: thr');
});

test('geminiText extracts candidate text and tolerates junk', () => {
  const raw = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'hello' }] } }] });
  assert.equal(geminiText(raw), 'hello');
  assert.equal(geminiText('not json'), null);
});

test('openaiText extracts delta content and ignores [DONE]', () => {
  const raw = JSON.stringify({ choices: [{ delta: { content: 'hi' } }] });
  assert.equal(openaiText(raw), 'hi');
  assert.equal(openaiText('[DONE]'), null);
  assert.equal(openaiText(JSON.stringify({ choices: [{ delta: {} }] })), null);
});

test('friendlyError names the provider and prefers auth guidance', () => {
  assert.match(friendlyError(401, 'bad key', new Error('x'), 'chatgpt'), /OpenAI API key was rejected/);
  assert.match(friendlyError(429, null, new Error('x'), 'gemini'), /Gemini is busy/);
  assert.equal(friendlyError(500, 'Upstream said no', new Error('x'), 'gemini'), 'Upstream said no');
});
