const axios = require('axios');
const logger = require('../utils/logger');
const cron = require('node-cron');
const { getSupabase } = require('../config/supabase');

const HACKATHONS_TABLE = 'hackathons';
let instance = null;

const DISPLAY_DATE = { year: 'numeric', month: 'short', day: 'numeric' };
const isValidDate = d => d instanceof Date && !isNaN(d.getTime());

/**
 * Pure: turn Devpost's `submission_period_dates` into display dates.
 *
 * Devpost omits years it considers obvious:
 *   "Jun 25 - Oct 27, 2026"        start has no year
 *   "Nov 01 - 30, 2026"            end has no month
 *   "Dec 28 - Jan 05, 2027"        period crosses a year boundary
 *   "Dec 28, 2026 - Jan 05, 2027"  fully specified
 *   "Sep 26, 2026"                 single-day event
 *
 * A side without a year takes it from the other side; a start that would fall after the
 * end belongs to the previous year. Only when no year appears at all is `now` used, and
 * an already-finished period is then read as next year's edition.
 * Unrecognised input is returned unchanged.
 */
function parseSubmissionPeriod(period, now = new Date()) {
  const [rawStart = '', rawEnd = ''] = (period || '').split(' - ').map(s => s.trim());
  const explicitYear = (rawEnd.match(/\b(\d{4})$/) || rawStart.match(/\b(\d{4})$/) || [])[1];
  const baseYear = explicitYear ?? String(now.getFullYear());
  const startMonth = (rawStart.match(/^([A-Za-z]{3})\b/) || [])[1];

  const toDate = (s, monthFallback) => {
    let m;
    if ((m = s.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/))) return new Date(`${m[1]} ${m[2]}, ${m[3]}`);
    if ((m = s.match(/^([A-Za-z]{3})\s+(\d{1,2})$/))) return new Date(`${m[1]} ${m[2]}, ${baseYear}`);
    if ((m = s.match(/^(\d{1,2}),\s*(\d{4})$/)) && monthFallback) return new Date(`${monthFallback} ${m[1]}, ${m[2]}`);
    return null;
  };

  const start = rawStart ? toDate(rawStart) : null;
  // A single-day event has no " - "; it ends the day it starts.
  const end = rawEnd ? toDate(rawEnd, startMonth) : isValidDate(start) ? new Date(start) : null;

  if (isValidDate(start) && isValidDate(end) && start > end) start.setFullYear(start.getFullYear() - 1);
  if (!explicitYear && isValidDate(end) && end < now) {
    end.setFullYear(end.getFullYear() + 1);
    if (isValidDate(start)) start.setFullYear(start.getFullYear() + 1);
  }

  return {
    startDate: isValidDate(start) ? start.toLocaleDateString('en-US', DISPLAY_DATE) : rawStart,
    endDate: isValidDate(end) ? end.toLocaleDateString('en-US', DISPLAY_DATE) : rawEnd,
  };
}

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
    this.axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    };
    this.initialize();
    this.setupCronJob();
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
            const { startDate, endDate } = parseSubmissionPeriod(h.submission_period_dates);
            if (h.submission_period_dates && !isValidDate(new Date(endDate))) {
              logger.warn(`Unrecognized submission period: ${h.submission_period_dates}`);
            }
            return {
              title: h.title,
              description: h.tagline || h.description || '',
              startDate,
              endDate,
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

  async executeDb(promise, errorMessage) {
    try {
      const { data, error } = await promise;
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(errorMessage, error);
      return null;
    }
  }

  async hydrateFromDb() {
    const supabase = await this.getSupabaseClient();
    if (!supabase) return;
    const data = await this.executeDb(
      supabase.from(HACKATHONS_TABLE).select('*').limit(500),
      'Failed to hydrate hackathons from DB:'
    );
    if (data) {
      this.replaceAll(data.map(fromDbRow));
    }
  }

  async persistDevpost(hackathons) {
    const supabase = await this.getSupabaseClient();
    if (!supabase || hackathons.length === 0) return;
    const rows = hackathons.map(h => toDbRow({ ...h, updated_at: new Date().toISOString() }));
    await this.executeDb(
      supabase.from(HACKATHONS_TABLE).upsert(rows, { onConflict: 'url', ignoreDuplicates: false }),
      'Failed to persist hackathons to DB:'
    );
  }

  async crawlAll() {
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
    const hackathon = { ...data };
    if (!hackathon.id) {
      hackathon.id = this.generateId(hackathon);
    }
    const row = toDbRow(hackathon);
    const supabase = await this.getSupabaseClient();
    if (supabase) {
      await this.executeDb(
        supabase.from(HACKATHONS_TABLE).upsert(row, { onConflict: 'url', ignoreDuplicates: false }),
        'Failed to persist hackathon:'
      );
    }
    this.hackathons.set(hackathon.id, hackathon);
    return hackathon;
  }

  async updateHackathon(id, data) {
    const existing = this.hackathons.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data, id };
    const supabase = await this.getSupabaseClient();
    if (supabase) {
      await this.executeDb(
        supabase.from(HACKATHONS_TABLE).update(toDbRow(updated)).eq('id', id),
        'Failed to persist hackathon update:'
      );
    }
    this.hackathons.set(id, updated);
    return updated;
  }

  async deleteHackathon(id) {
    const supabase = await this.getSupabaseClient();
    if (supabase) {
      await this.executeDb(
        supabase.from(HACKATHONS_TABLE).delete().eq('id', id),
        'Failed to delete hackathon from DB:'
      );
    }
    return this.hackathons.delete(id);
  }
}

module.exports = HackathonService;

// Exported for tests; the crawler uses it above.
module.exports.parseSubmissionPeriod = parseSubmissionPeriod;
