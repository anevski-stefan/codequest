const { Store } = require('express-session');
const { getSupabase } = require('../config/supabase');

const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

class SupabaseSessionStore extends Store {
  constructor() {
    super();
    this.table = process.env.SESSION_TABLE || 'sessions';
  }

  expiryFromSession(session) {
    const cookie = session?.cookie;
    if (cookie?.expires instanceof Date && !Number.isNaN(cookie.expires.getTime())) {
      return cookie.expires.toISOString();
    }
    if (typeof cookie?.originalMaxAge === 'number' && cookie.originalMaxAge > 0) {
      return new Date(Date.now() + cookie.originalMaxAge).toISOString();
    }
    return new Date(Date.now() + DEFAULT_MAX_AGE_MS).toISOString();
  }

  async get(sid, callback) {
    try {
      const { data, error } = await getSupabase()
        .from(this.table)
        .select('sess, expire')
        .eq('sid', sid)
        .maybeSingle();
      if (error) return callback(error);
      if (!data) return callback(null, null);
      if (new Date(data.expire) <= new Date()) return callback(null, null);
      let session = data.sess;
      if (typeof session === 'string') {
        session = JSON.parse(session);
      }
      callback(null, session);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, session, callback) {
    try {
      const expire = this.expiryFromSession(session);
      const { error } = await getSupabase()
        .from(this.table)
        .upsert({
          sid,
          sess: session,
          expire
        }, {
          onConflict: 'sid'
        });
      if (error) return callback(error);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      const { error } = await getSupabase()
        .from(this.table)
        .delete()
        .eq('sid', sid);
      if (error) return callback(error);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async touch(sid, session, callback) {
    try {
      const expire = this.expiryFromSession(session);
      const { error } = await getSupabase()
        .from(this.table)
        .update({
          expire
        })
        .eq('sid', sid);
      if (error) return callback(error);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = SupabaseSessionStore;