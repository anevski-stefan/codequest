const axios = require('axios');
const logger = require('../utils/logger');
const cron = require('node-cron');
const { getSupabase } = require('../config/supabase');

const HACKATHONS_TABLE = 'hackathons';
let instance = null;

function toDbRow(hackathon) {
  return {
    id: hackathon.id,
    title: hackathon.title,
    description: hackathon.description,
    start_date: hackathon.startDate,
    end_date: hackathon.endDate,
    url: hackathon.url,
    source: hackathon.source,
    location: hackathon.location,
    prize: hackathon.prize,
    tags: hackathon.tags || [],
    participant_count: hackathon.participantCount || 0,
    submission_period: hackathon.submissionPeriod,
    created_at: hackathon.createdAt,
    updated_at: hackathon.updatedAt
  };
}

function fromDbRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    url: row.url,
    source: row.source,
    location: row.location,
    prize: row.prize,
    tags: row.tags || [],
    participantCount: row.participant_count || 0,
    submissionPeriod: row.submission_period,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

class HackathonService {
  constructor() {
    if (instance) return instance;
    instance = this;
    this.hackathons = new Map();
    this.isInitialCrawlComplete = false;
    this.crawlPromise = null;
    this._queue = Promise.resolve();
    this.axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    };
    this.initialize();
    this.setupCronJob();
  }

  formatDate(dateStr, dateCtx = {}) {
    if (!dateStr) return '';
    try {
      dateStr = dateStr.trim();
      if (dateStr.match(/^[A-Za-z]{3}\s+\d{1,2},\s*\d{4}$/)) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          dateCtx.month = date.toLocaleString('en-US', {
            month: 'short'
          });
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      }
      if (dateStr.match(/^[A-Za-z]{3}\s+\d{1,2}$/)) {
        const [month, day] = dateStr.split(' ');
        const currentYear = new Date().getFullYear();
        const date = new Date(`${month} ${day}, ${currentYear}`);
        if (!isNaN(date.getTime())) {
          dateCtx.month = month;
          if (date < new Date()) {
            date.setFullYear(currentYear + 1);
          }
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      }
      if (dateStr.match(/^\d{1,2},\s*\d{4}$/)) {
        const [day, year] = dateStr.split(',').map(s => s.trim());
        const month = dateCtx.month;
        if (!month) {
          logger.warn(`No month available for date: ${dateStr}`);
          return dateStr;
        }
        const date = new Date(`${month} ${day}, ${year}`);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      }
      logger.warn(`Unrecognized date format: ${dateStr}`);
      return dateStr;
    } catch (error) {
      logger.warn(`Error formatting date: ${dateStr}`, error);
      return dateStr;
    }
  }

  async initialize() {
    await this.hydrateFromDb();
    this.crawlAll().catch(error => {
      logger.error('Error during initialization:', error);
      this.isInitialCrawlComplete = true;
    });
  }

  setupCronJob() {
    const schedule = process.env.HACKATHON_CRAWL_CRON || '0 */6 * * *';
    this.cronTask = cron.schedule(schedule, async () => {
      try {
        await this.crawlAll();
      } catch (error) {
        logger.error('Scheduled crawl failed:', error);
      }
    });
  }

  shutdown() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
  }

  processTags(hackathon) {
    const processList = items => {
      if (!items) return [];
      if (!Array.isArray(items)) return [];
      return items.map(item => item.name || '').filter(Boolean);
    };
    const themeTags = processList(hackathon.themes);
    const techTags = processList(hackathon.technologies);
    const platformTags = processList(hackathon.platforms);
    return [...new Set([...themeTags, ...techTags, ...platformTags])];
  }

  async crawlDevpost() {
    try {
      let allHackathons = [];
      let page = 1;
      let hasMorePages = true;
      const MAX_PAGES = 15;
      while (hasMorePages && page <= MAX_PAGES) {
        try {
          const apiResponse = await axios.get(`https://devpost.com/api/hackathons`, {
            ...this.axiosConfig,
            params: {
              page,
              status: 'open',
              order_by: 'deadline',
              sort_by: 'deadline',
              per_page: 100
            }
          });
          if (!apiResponse.data?.hackathons) {
            logger.info('No more hackathons found');
            break;
          }
          const hackathons = apiResponse.data.hackathons.map(h => {
            const parts = (h.submission_period_dates || '').split(' - ');
            const dateCtx = {};
            return {
              title: h.title,
              description: h.tagline || h.description || '',
              startDate: this.formatDate(parts[0], dateCtx),
              endDate: this.formatDate(parts[1], dateCtx),
              url: h.url,
              source: 'devpost',
              location: h.displayed_location?.location || 'Online',
              prize: h.prize_amount ? h.prize_amount.replace(/<[^>]*>/g, '') : 'See website for details',
              tags: this.processTags(h),
              participantCount: h.registrations_count || 0,
              submissionPeriod: h.submission_period_dates || ''
            };
          });
          if (hackathons.length > 0) {
            allHackathons = [...allHackathons, ...hackathons];
          }
          hasMorePages = apiResponse.data.hackathons.length > 0;
          page++;
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          logger.error(`Error fetching page ${page}:`, error.message);
          break;
        }
      }
      return allHackathons;
    } catch (error) {
      logger.error('Error in crawlDevpost:', error);
      return [];
    }
  }

  async getSupabaseClient() {
    try {
      return getSupabase();
    } catch (error) {
      logger.warn('Supabase unavailable; running with in-memory hackathon store:', error.message);
      return null;
    }
  }

  _enqueue(fn) {
    const run = this._queue.then(() => fn());
    this._queue = run.catch(() => {});
    return run;
  }

  async hydrateFromDb() {
    return this._enqueue(async () => {
      const supabase = await this.getSupabaseClient();
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from(HACKATHONS_TABLE)
          .select('*')
          .limit(500);
        if (error) throw error;
        if (data) {
          this.replaceAll(data.map(fromDbRow));
        }
      } catch (error) {
        logger.error('Failed to hydrate hackathons from DB:', error);
      }
    });
  }

  async persistDevpost(hackathons) {
    const supabase = await this.getSupabaseClient();
    if (!supabase || hackathons.length === 0) return;
    const rows = hackathons.map(h => toDbRow({ ...h, updated_at: new Date().toISOString() }));
    try {
      const { error } = await supabase
        .from(HACKATHONS_TABLE)
        .upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    } catch (error) {
      logger.error('Failed to persist hackathons to DB:', error);
    }
  }

  async crawlAll() {
    if (this.crawlPromise) return this.crawlPromise;
    return this._enqueue(async () => {
      if (this.crawlPromise) return this.crawlPromise;
      this.crawlPromise = (async () => {
        try {
          const hackathons = await this.crawlDevpost();
          hackathons.forEach(h => {
            h.id = this.generateId(h);
          });
          await this.persistDevpost(hackathons);
          const merged = new Map();
          for (const h of this.hackathons.values()) {
            if (h.source !== 'devpost') {
              merged.set(h.id, h);
            }
          }
          hackathons.forEach(h => merged.set(h.id, h));
          this.replaceAll(Array.from(merged.values()));
          this.isInitialCrawlComplete = true;
          return hackathons;
        } catch (error) {
          logger.error('Error in crawlAll:', error);
          throw error;
        } finally {
          this.crawlPromise = null;
        }
      })();
      return this.crawlPromise;
    });
  }

  replaceAll(hackathons) {
    const next = new Map();
    hackathons.forEach(h => next.set(h.id, h));
    this.hackathons = next;
  }

  async getAllHackathons() {
    try {
      const hackathons = Array.from(this.hackathons.values());
      if (hackathons.length === 0) {
        await this.hydrateFromDb();
        const fromDb = Array.from(this.hackathons.values());
        if (fromDb.length > 0) return fromDb;
        await this.crawlAll();
        return Array.from(this.hackathons.values());
      }
      return hackathons;
    } catch (error) {
      logger.error('Error in getAllHackathons:', error);
      return [];
    }
  }

  getInitialCrawlStatus() {
    return this.isInitialCrawlComplete;
  }

  generateId(hackathon) {
    if (hackathon.url) {
      try {
        const slug = new URL(hackathon.url).pathname.split('/').filter(Boolean).pop();
        if (slug) return slug;
      } catch (e) {}
    }
    const base = (hackathon.title || 'hackathon').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${base || 'hackathon'}-${Date.now().toString(36)}`;
  }

  getHackathonById(id) {
    return this.hackathons.get(id) || null;
  }

  async createHackathon(data) {
    return this._enqueue(async () => {
      const hackathon = { ...data };
      if (!hackathon.id) {
        hackathon.id = this.generateId(hackathon);
      }
      const row = toDbRow(hackathon);
      const supabase = await this.getSupabaseClient();
      if (supabase) {
        try {
          const { error } = await supabase.from(HACKATHONS_TABLE).insert(row);
          if (error) throw error;
        } catch (error) {
          logger.error('Failed to persist new hackathon:', error);
        }
      }
      this.hackathons.set(hackathon.id, hackathon);
      return hackathon;
    });
  }

  async updateHackathon(id, data) {
    return this._enqueue(async () => {
      const existing = this.hackathons.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data, id };
      const supabase = await this.getSupabaseClient();
      if (supabase) {
        try {
          const { error } = await supabase
            .from(HACKATHONS_TABLE)
            .update(toDbRow(updated))
            .eq('id', id);
          if (error) throw error;
        } catch (error) {
          logger.error('Failed to persist hackathon update:', error);
        }
      }
      this.hackathons.set(id, updated);
      return updated;
    });
  }

  async deleteHackathon(id) {
    return this._enqueue(async () => {
      const supabase = await this.getSupabaseClient();
      if (supabase) {
        try {
          const { error } = await supabase.from(HACKATHONS_TABLE).delete().eq('id', id);
          if (error) throw error;
        } catch (error) {
          logger.error('Failed to delete hackathon from DB:', error);
        }
      }
      return this.hackathons.delete(id);
    });
  }
}

module.exports = HackathonService;
