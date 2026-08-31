const crypto = require('crypto');

// The scrypt salt is a NON-SECRET parameter: its purpose is uniqueness per-record,
// not confidentiality. All new records use a random per-record salt (see encrypt()).
// This constant is only a backward-compatibility fallback for records encrypted before
// random-salt support existed (it is NOT a credential; security relies on AI_KEY_SECRET).
// It can be overridden via AI_KEY_LEGACY_SALT for deployments that must match historic data.
const LEGACY_SALT = process.env.AI_KEY_LEGACY_SALT || 'codequest-ai-key-salt';

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

// Upgrades a legacy record (which used the fixed LEGACY_SALT and has no `salt` field)
// to the random-salt scheme the next time it is read, so records no longer depend on
// the static salt. Returns the plaintext and, if the record was legacy, the upgraded
// record so callers can persist it.
function decryptAndUpgrade(record) {
  const plain = decrypt(record);
  if (record.salt) {
    return {
      plain,
      upgraded: null
    };
  }
  return {
    plain,
    upgraded: encrypt(plain)
  };
}

module.exports = {
  encrypt,
  decrypt,
  decryptAndUpgrade
};
