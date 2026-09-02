const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const aiKeyStore = require('../utils/aiKeyStore');
const { badRequest, asyncHandler } = require('../utils/httpError');

const SERVICES = ['chatgpt', 'gemini'];

router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  res.json(await aiKeyStore.hasAiKeys(req.user.id));
}));

router.put('/:service', asyncHandler(async (req, res) => {
  const service = req.params.service.toLowerCase();
  if (!SERVICES.includes(service)) {
    return badRequest(res, 'Invalid AI service');
  }
  const rawKey = typeof req.body.key === 'string' ? req.body.key.trim() : '';
  if (!rawKey) {
    return badRequest(res, 'API key is required');
  }
  if (rawKey.length > 2000) {
    return badRequest(res, 'API key is too long');
  }
  await aiKeyStore.setAiKey(req.user.id, service, rawKey);
  res.json({ ok: true, service });
}));

router.delete('/:service', asyncHandler(async (req, res) => {
  const service = req.params.service.toLowerCase();
  if (!SERVICES.includes(service)) {
    return badRequest(res, 'Invalid AI service');
  }
  await aiKeyStore.deleteAiKey(req.user.id, service);
  res.json({ ok: true, service });
}));

module.exports = router;