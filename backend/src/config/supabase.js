const {
  createClient
} = require('@supabase/supabase-js');
const { isRetryableStatus, getRetryDelayMs } = require('../utils/retry');

const MAX_FETCH_ATTEMPTS = 3;

async function fetchWithRetry(input, init) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(input, init);
      if (!isRetryableStatus(response.status) || attempt === MAX_FETCH_ATTEMPTS) {
        return response;
      }
      lastError = response;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_FETCH_ATTEMPTS) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, getRetryDelayMs(init?.headers ?? {}, attempt, { fallbackBaseMs: 200, fallbackCapMs: 5000 })));
  }
  return lastError;
}

let client = null;
function getSupabase() {
  if (client) return client;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  client = createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      fetch: fetchWithRetry
    }
  });
  return client;
}
module.exports = {
  getSupabase
};