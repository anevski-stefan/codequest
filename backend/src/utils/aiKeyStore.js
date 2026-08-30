const fs = require('fs');
const path = require('path');
const {
  encrypt,
  decrypt
} = require('./crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'aiKeys.json');

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
