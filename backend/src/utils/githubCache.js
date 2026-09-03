const DEFAULT_MAX_ENTRIES = 500;
const KEEPALIVE_MS = 0;

function createCache({ maxEntries = DEFAULT_MAX_ENTRIES } = {}) {
  const store = new Map();
  let enabled = true;

  function isValid(entry, now, keepaliveMs) {
    const windowMs = Number.isFinite(entry.ttlMs) && entry.ttlMs > 0 ? entry.ttlMs : KEEPALIVE_MS;
    const keepAlive = keepaliveMs > 0 ? keepaliveMs : KEEPALIVE_MS;
    if (windowMs > 0 && now - entry.storedAt > windowMs) return false;
    if (keepAlive > 0 && now - entry.lastUsedAt > keepAlive) return false;
    return true;
  }

  function touch(key, entry, now) {
    entry.lastUsedAt = now;
    store.delete(key);
    store.set(key, entry);
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) store.clear();
  }

  function get(key, { now = Date.now(), keepAliveMs = 0 } = {}) {
    if (!enabled) return null;
    const entry = store.get(key);
    if (!entry) return null;
    if (!isValid(entry, now, keepAliveMs)) {
      return null;
    }
    touch(key, entry, now);
    return entry.value;
  }

  function getStale(key) {
    if (!enabled) return null;
    const entry = store.get(key);
    return entry ? entry.value : null;
  }

  function set(key, value, ttlMs, { now = Date.now() } = {}) {
    if (!enabled) return;
    store.set(key, {
      value,
      ttlMs,
      storedAt: now,
      lastUsedAt: now
    });
    if (store.size > maxEntries) {
      let excess = store.size - maxEntries;
      for (const oldestKey of store.keys()) {
        if (excess <= 0) break;
        store.delete(oldestKey);
        excess--;
      }
    }
  }

  function setFresh(key, value, ttlMs, { now = Date.now() } = {}) {
    if (!enabled) return;
    store.set(key, {
      value,
      ttlMs,
      storedAt: now,
      lastUsedAt: now
    });
  }

  function clear() {
    store.clear();
  }

  function size() {
    return store.size;
  }

  return {
    get,
    getStale,
    set,
    setFresh,
    clear,
    size,
    setEnabled
  };
}

module.exports = { createCache };

