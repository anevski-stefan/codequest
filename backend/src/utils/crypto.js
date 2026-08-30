const crypto = require('crypto');

const SALT = 'codequest-ai-key-salt';

let secretReady = false;
let key = null;

function ensureSecret() {
  if (secretReady) return;
  const secret = process.env.AI_KEY_SECRET;
  if (!secret) {
    throw new Error('AI_KEY_SECRET environment variable is required to encrypt/decrypt secrets');
  }
  key = crypto.scryptSync(secret, SALT, 32);
  secretReady = true;
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

module.exports = {
  encrypt,
  decrypt
};
