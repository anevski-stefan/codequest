const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'aiKeys.json');

let secretReady = false;
let key = null;

function ensureSecret() {
  if (secretReady) return;
  const secret = process.env.AI_KEY_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AI_KEY_SECRET environment variable is required in production');
    }
    console.warn('[aiKeyStore] AI_KEY_SECRET not set; using an ephemeral in-memory key. Keys will not survive a restart. Set AI_KEY_SECRET for persistence.');
    key = crypto.randomBytes(32);
  } else {
    key = crypto.scryptSync(secret, 'codequest-ai-key-salt', 32);
  }
  secretReady = true;
}

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeStore(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}

function encrypt(plain) {
  ensureSecret();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ct: ct.toString('hex')
  };
}

function decrypt(record) {
  ensureSecret();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(record.tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(record.ct, 'hex')), decipher.final()]).toString('utf8');
}

function setAiKey(userId, service, rawKey) {
  const data = readStore();
  if (!data[userId]) data[userId] = {};
  data[userId][service] = encrypt(rawKey);
  writeStore(data);
}

function getAiKey(userId, service) {
  const data = readStore();
  const record = data[userId] && data[userId][service];
  if (!record) return null;
  try {
    return decrypt(record);
  } catch (e) {
    return null;
  }
}

function deleteAiKey(userId, service) {
  const data = readStore();
  if (data[userId] && data[userId][service]) {
    delete data[userId][service];
    writeStore(data);
  }
}

function hasAiKeys(userId) {
  const data = readStore();
  const user = data[userId] || {};
  return {
    chatgpt: Boolean(user.chatgpt),
    gemini: Boolean(user.gemini)
  };
}

module.exports = {
  setAiKey,
  getAiKey,
  deleteAiKey,
  hasAiKeys
};
