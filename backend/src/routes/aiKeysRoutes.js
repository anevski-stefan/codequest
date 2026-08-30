const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const aiKeyStore = require('../utils/aiKeyStore');

const SERVICES = ['chatgpt', 'gemini'];

router.get('/', requireAuth, async (req, res) => {
  try {
    res.json(await aiKeyStore.hasAiKeys(req.user.id));
  } catch (e) {
    console.error('Failed to read AI keys:', e);
    res.status(500).json({ error: 'Failed to read API keys' });
  }
});

router.put('/:service', requireAuth, express.json(), async (req, res) => {
  const service = req.params.service.toLowerCase();
  if (!SERVICES.includes(service)) {
    return res.status(400).json({ error: 'Invalid AI service' });
  }
  const rawKey = typeof req.body.key === 'string' ? req.body.key.trim() : '';
  if (!rawKey) {
    return res.status(400).json({ error: 'API key is required' });
  }
  try {
    await aiKeyStore.setAiKey(req.user.id, service, rawKey);
    res.json({ ok: true, service });
  } catch (e) {
    console.error('Failed to store AI key:', e);
    res.status(500).json({ error: 'Failed to store API key' });
  }
});

router.delete('/:service', requireAuth, async (req, res) => {
  const service = req.params.service.toLowerCase();
  if (!SERVICES.includes(service)) {
    return res.status(400).json({ error: 'Invalid AI service' });
  }
  try {
    await aiKeyStore.deleteAiKey(req.user.id, service);
    res.json({ ok: true, service });
  } catch (e) {
    console.error('Failed to delete AI key:', e);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

module.exports = router;
