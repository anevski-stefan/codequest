const {
  createClient
} = require('@supabase/supabase-js');
let client = null;
function getSupabase() {
  if (client) return client;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  client = createClient(supabaseUrl, supabaseServiceKey);
  return client;
}
module.exports = {
  getSupabase
};
