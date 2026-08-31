const {
  getSupabase
} = require('../config/supabase');

const {
  encrypt,
  decrypt,
  decryptAndUpgrade
} = require('./crypto');

async function setAiKey(userId, service, rawKey) {
  await getSupabase().from('ai_keys').upsert({
    user_id: String(userId),
    service,
    encrypted_key: JSON.stringify(encrypt(rawKey))
  }, { onConflict: 'user_id,service' });
}

async function getAiKey(userId, service) {
  const { data, error } = await getSupabase().from('ai_keys')
    .select('encrypted_key')
    .eq('user_id', String(userId))
    .eq('service', service)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  try {
    const { plain, upgraded } = decryptAndUpgrade(JSON.parse(data.encrypted_key));
    if (upgraded) {
      await getSupabase().from('ai_keys')
        .update({ encrypted_key: JSON.stringify(upgraded) })
        .eq('user_id', String(userId))
        .eq('service', service);
    }
    return plain;
  } catch (e) {
    return null;
  }
}

async function deleteAiKey(userId, service) {
  await getSupabase().from('ai_keys')
    .delete()
    .eq('user_id', String(userId))
    .eq('service', service);
}

async function hasAiKeys(userId) {
  const { data, error } = await getSupabase().from('ai_keys')
    .select('service')
    .eq('user_id', String(userId));
  if (error) throw error;
  const present = new Set(data.map(row => row.service));
  return {
    chatgpt: present.has('chatgpt'),
    gemini: present.has('gemini')
  };
}

module.exports = {
  setAiKey,
  getAiKey,
  deleteAiKey,
  hasAiKeys
};
