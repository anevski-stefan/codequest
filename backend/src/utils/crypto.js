const crypto = require('crypto');

const LEGACY_SALT = 'codequest-ai-key-salt';

let secret = null;
let secretReady = false;

function getSecret() {
  if (secretReady) return secret;
  const value = process.env.AI_KEY_SECRET;
  if (!value) {
    throw new Error('AI_KEY_SECRET environment variable is required to encrypt/decrypt secrets');
  }
  secret = value;
  secretReady = true;
  return secret;
}

function deriveKey(secretText, salt) {
  return crypto.scryptSync(secretText, salt, 32);
}

function encrypt(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = deriveKey(getSecret(), salt);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    salt,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ct: ct.toString('hex')
  };
}

function decrypt(record) {
  const salt = record.salt || LEGACY_SALT;
  const key = deriveKey(getSecret(), salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(record.tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(record.ct, 'hex')), decipher.final()]).toString('utf8');
}

module.exports = {
  encrypt,
  decrypt
};
