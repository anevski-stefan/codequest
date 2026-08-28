const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const aiKeyStore = require('../utils/aiKeyStore');

const SERVICES = ['chatgpt', 'gemini'];

router.get('/', requireAuth, (req, res) => {
  res.json(aiKeyStore.hasAiKeys(req.user.id));
});

router.put('/:service', requireAuth, express.json(), (req, res) => {
  const service = req.params.service.toLowerCase();
  if (!SERVICES.includes(service)) {
    return res.status(400).json({ error: 'Invalid AI service' });
  }
  const rawKey = typeof req.body.key === 'string' ? req.body.key.trim() : '';
  if (!rawKey) {
    return res.status(400).json({ error: 'API key is required' });
  }
  try {
    aiKeyStore.setAiKey(req.user.id, service, rawKey);
    res.json({ ok: true, service });
  } catch (e) {
    console.error('Failed to store AI key:', e);
    res.status(500).json({ error: 'Failed to store API key' });
  }
});

router.delete('/:service', requireAuth, (req, res) => {
  const service = req.params.service.toLowerCase();
  if (!SERVICES.includes(service)) {
    return res.status(400).json({ error: 'Invalid AI service' });
  }
  aiKeyStore.deleteAiKey(req.user.id, service);
  res.json({ ok: true, service });
});

module.exports = router;
