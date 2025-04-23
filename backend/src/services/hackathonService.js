const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

const hackathonCache = {
  data: [],
  lastUpdated: null
};

class HackathonService {
  constructor() {
    this.hackathons = new Map();
    this.isInitialCrawlComplete = false;
    this.axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    };
    this.sources = {
      DEVPOST: 'devpost',
      MLH: 'mlh',
      HACKEREARTH: 'hackerearth',
      UNSTOP: 'unstop',
      DEVFOLIO: 'devfolio',
      EVENTBRITE: 'eventbrite'
    };
    
    // Start crawling in background
    this.initialize();
    // Set up periodic crawling
    this.setupCronJob();
  }

  formatDate(dateStr, isEndDate = false) {
    if (!dateStr) return '';
    try {
      // Clean up the input string
      dateStr = dateStr.trim();
      
      // Case 1: Full date with month (e.g., "Feb 09, 2025")
      if (dateStr.match(/^[A-Za-z]{3}\s+\d{1,2},\s*\d{4}$/)) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          this.lastProcessedMonth = date.toLocaleString('en-US', { month: 'short' });
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      }
      
      // Case 2: Just month and day (e.g., "Feb 09")
      if (dateStr.match(/^[A-Za-z]{3}\s+\d{1,2}$/)) {
        const [month, day] = dateStr.split(' ');
        const currentYear = new Date().getFullYear();
        const date = new Date(`${month} ${day}, ${currentYear}`);
        
        if (!isNaN(date.getTime())) {
          this.lastProcessedMonth = month;
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
        if (!this.lastProcessedMonth && !isEndDate) {
          console.warn(`No month available for date: ${dateStr}`);
          return dateStr;
        }
        
        const [day, year] = dateStr.split(',').map(s => s.trim());
        const month = this.lastProcessedMonth || 'Jan';
        const date = new Date(`${month} ${day}, ${year}`);
        
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      }

      console.warn(`Unrecognized date format: ${dateStr}`);
      return dateStr;
    } catch (error) {
      console.warn(`Error formatting date: ${dateStr}`, error);
      return dateStr;
    }
  }

  async initialize() {
    this.crawlAll().catch(error => {
      console.error('Error during initialization:', error);
      this.isInitialCrawlComplete = true; 
    });
  }

  setupCronJob() {
    // Schedule crawler to run every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      try {
        await this.crawlAll();
      } catch (error) {
        console.error('Scheduled crawl failed:', error);
      }
    });
  }

  processTags(hackathon) {
    const processList = (items) => {
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
      const MAX_PAGES = 50;

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
            console.log('No more hackathons found');
            break;
          }

          // Process hackathons without fetching individual details
          const hackathons = apiResponse.data.hackathons.map(h => ({
            title: h.title,
            description: h.tagline || h.description || '',
            startDate: this.formatDate(h.submission_period_dates?.split(' - ')[0]),
            endDate: this.formatDate(h.submission_period_dates?.split(' - ')[1]),
            url: h.url,
            source: 'devpost',
            location: h.displayed_location?.location || 'Online',
            prize: h.prize_amount ? h.prize_amount.replace(/<[^>]*>/g, '') : 'See website for details',
            tags: this.processTags(h),
            participantCount: h.registrations_count || 0,
            submissionPeriod: h.submission_period_dates || ''
          }));

          if (hackathons.length > 0) {
            allHackathons = [...allHackathons, ...hackathons];
          }

          hasMorePages = apiResponse.data.hackathons.length > 0;
          page++;

          // Add a small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          console.error(`Error fetching page ${page}:`, error.message);
          break;
        }
      }

      return allHackathons;
    } catch (error) {
      console.error('Error in crawlDevpost:', error);
      return [];
    }
  }

  async retryOperation(operation, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  async crawlAll() {
    try {
      const hackathons = await this.crawlDevpost();
      
      this.hackathons.clear();
      hackathons.forEach(h => this.hackathons.set(h.url, h));
      this.isInitialCrawlComplete = true;
      return hackathons;
    } catch (error) {
      console.error('Error in crawlAll:', error);
      throw error;
    }
  }

  storeHackathons(hackathons) {
    if (!Array.isArray(hackathons)) {
      console.error('Invalid hackathons data:', hackathons);
      return;
    }
    
    this.hackathons.clear();
    hackathons.forEach(hackathon => {
      if (hackathon && hackathon.url) {
        this.hackathons.set(hackathon.url, hackathon);
      }
    });
  }

  async getAllHackathons() {
    try {
      const hackathons = Array.from(this.hackathons.values());

      if (hackathons.length === 0) {
        await this.crawlAll();
        return Array.from(this.hackathons.values());
      }

      return hackathons;
    } catch (error) {
      console.error('Error in getAllHackathons:', error);
      return [];
    }
  }

  getInitialCrawlStatus() {
    return this.isInitialCrawlComplete;
  }
}

module.exports = HackathonService; 