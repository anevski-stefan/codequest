const {
  createClient
} = require('@supabase/supabase-js');

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_FETCH_ATTEMPTS = 3;

function getRetryDelayMs(retryAfterHeader, attempt) {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 60000);
    }
  }
  return Math.min(100 * 2 ** attempt, 5000);
}

async function fetchWithRetry(input, init) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(input, init);
      if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_FETCH_ATTEMPTS) {
        return response;
      }
      lastError = response;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_FETCH_ATTEMPTS) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, getRetryDelayMs(init?.headers?.RetryAfter, attempt)));
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