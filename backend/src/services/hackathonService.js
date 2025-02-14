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
      
      // Case 3: Just day and year (e.g., "15, 2025")
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
    console.log('Initializing HackathonService...');
    this.crawlAll().catch(error => {
      console.error('Error during initialization:', error);
      this.isInitialCrawlComplete = true; // Set to true even on error to prevent hanging
    });
  }

  setupCronJob() {
    // Schedule crawler to run every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('Running scheduled hackathon crawl...');
      try {
        await this.crawlAll();
        console.log('Scheduled hackathon crawl completed');
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
            console.log(`Fetched ${hackathons.length} hackathons from page ${page}. Total: ${allHackathons.length}`);
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
      console.log('Starting hackathon crawl...');
      const hackathons = await this.crawlDevpost();
      
      // Update the cache
      this.hackathons.clear();
      hackathons.forEach(h => this.hackathons.set(h.url, h));
      this.isInitialCrawlComplete = true;
      
      console.log(`Crawl completed. Total hackathons: ${hackathons.length}`);
      return hackathons;
    } catch (error) {
      console.error('Error in crawlAll:', error);
      throw error;
    }
  }

  async crawlMlh() {
    try {
      console.log('Crawling MLH hackathons...');
      const response = await axios.get('https://mlh.io/events', this.axiosConfig);
      const $ = cheerio.load(response.data);
      const hackathons = [];

      $('.event-wrapper').each((_, element) => {
        try {
          const $element = $(element);
          const title = $element.find('.event-name').text().trim();
          const url = 'https://mlh.io' + $element.find('a').attr('href');
          const location = $element.find('.event-location').text().trim();
          const dateStr = $element.find('.event-date').text().trim();
          const imageUrl = $element.find('.event-logo').attr('src');

          hackathons.push({
            title,
            url,
            description: `MLH Hackathon: ${title}`,
            startDate: this.formatDate(dateStr.split(' - ')[0]),
            endDate: this.formatDate(dateStr.split(' - ')[1] || dateStr.split(' - ')[0]),
            source: this.sources.MLH,
            location: location || 'Online',
            prize: 'See website for details',
            tags: ['mlh', 'hackathon'],
            participantCount: 0,
            imageUrl
          });
        } catch (error) {
          console.error('Error parsing MLH hackathon:', error);
        }
      });

      return hackathons;
    } catch (error) {
      console.error('Error crawling MLH:', error);
      return [];
    }
  }

  async crawlHackerEarth() {
    try {
      console.log('Crawling HackerEarth hackathons...');
      const response = await axios.get('https://www.hackerearth.com/challenges/hackathon/', {
        ...this.axiosConfig,
        headers: {
          ...this.axiosConfig.headers,
          'Accept': 'application/json'
        }
      });

      const $ = cheerio.load(response.data);
      const hackathons = [];

      $('.challenge-card-modern').each((_, element) => {
        try {
          const $element = $(element);
          const title = $element.find('.challenge-name').text().trim();
          const url = 'https://www.hackerearth.com' + $element.find('.challenge-card-wrapper').attr('href');
          const description = $element.find('.challenge-description').text().trim();
          const dateStr = $element.find('.challenge-date').text().trim();
          const location = $element.find('.challenge-location').text().trim() || 'Online';

          // Extract start and end dates
          const startMatch = dateStr.match(/Starts on: (.+?)(?=\s*Ends)/i);
          const endMatch = dateStr.match(/Ends on: (.+)/i);
          
          const startDate = startMatch ? this.formatDate(startMatch[1]) : '';
          const endDate = endMatch ? this.formatDate(endMatch[1]) : '';

          if (startDate && endDate) {
            hackathons.push({
              title,
              url,
              description,
              startDate,
              endDate,
              source: this.sources.HACKEREARTH,
              location,
              prize: 'See website for details',
              tags: ['hackerearth', 'hackathon'],
              participantCount: 0
            });
          }
        } catch (error) {
          console.error('Error parsing HackerEarth hackathon:', error);
        }
      });

      return hackathons;
    } catch (error) {
      console.error('Error crawling HackerEarth:', error);
      return [];
    }
  }

  async crawlUnstop() {
    try {
      console.log('Crawling Unstop hackathons...');
      const response = await axios.get('https://unstop.com/api/public/opportunity/search', {
        ...this.axiosConfig,
        params: {
          opportunity_type: 'hackathons',
          filters: JSON.stringify({
            opportunity_status: ['1'] // Active opportunities
          }),
          page: 1,
          per_page: 100
        }
      });

      if (!response.data?.data?.opportunities) {
        throw new Error('Invalid response format from Unstop');
      }

      const hackathons = response.data.data.opportunities.map(event => ({
        title: event.title,
        url: `https://unstop.com/hackathons/${event.slug}`,
        description: event.description || '',
        startDate: this.formatDate(event.start_date),
        endDate: this.formatDate(event.end_date),
        source: this.sources.UNSTOP,
        location: event.location_type || 'Online',
        prize: event.prize_worth ? `₹${event.prize_worth}` : 'See website for details',
        tags: ['unstop', 'hackathon', ...(event.tags || [])],
        participantCount: event.participant_count || 0,
        imageUrl: event.image_url
      }));

      return hackathons;
    } catch (error) {
      console.error('Error crawling Unstop:', error);
      return [];
    }
  }

  async crawlDevfolio() {
    try {
      console.log('Crawling Devfolio hackathons...');
      const response = await axios.get('https://api.devfolio.co/api/hackathons?filter=upcoming', {
        ...this.axiosConfig,
        headers: {
          ...this.axiosConfig.headers,
          'Accept': 'application/json'
        }
      });

      if (!response.data?.data) {
        throw new Error('Invalid response format from Devfolio API');
      }

      const hackathons = response.data.data.map(event => ({
        title: event.name,
        url: `https://devfolio.co/hackathons/${event.slug}`,
        description: event.tagline || '',
        startDate: this.formatDate(new Date(event.starts_at).toISOString()),
        endDate: this.formatDate(new Date(event.ends_at).toISOString()),
        source: this.sources.DEVFOLIO,
        location: event.is_online ? 'Online' : event.venue || 'TBA',
        prize: event.prize_pool ? `$${event.prize_pool}` : 'See website for details',
        tags: ['devfolio', 'hackathon'],
        participantCount: event.participant_count || 0
      }));

      return hackathons;
    } catch (error) {
      console.error('Error crawling Devfolio:', error);
      return [];
    }
  }

  async crawlEventbrite() {
    try {
      console.log('Crawling Eventbrite hackathons...');
      const response = await axios.get(
        'https://www.eventbrite.com/d/online/hackathon/?page=1',
        this.axiosConfig
      );
      const $ = cheerio.load(response.data);
      const hackathons = [];

      $('.eds-event-card-content').each((_, element) => {
        try {
          const $element = $(element);
          const title = $element.find('.eds-event-card__formatted-name').text().trim();
          const url = $element.find('a').attr('href');
          const dateStr = $element.find('.eds-event-card-content__sub-title').text().trim();
          const [startDate, endDate] = this.parseEventbriteDate(dateStr);

          hackathons.push({
            title,
            url,
            description: title,
            startDate,
            endDate,
            source: this.sources.EVENTBRITE,
            location: 'Online',
            prize: 'See website for details',
            tags: ['eventbrite', 'hackathon'],
            participantCount: 0
          });
        } catch (error) {
          console.error('Error parsing Eventbrite hackathon:', error);
        }
      });

      return hackathons;
    } catch (error) {
      console.error('Error crawling Eventbrite:', error);
      return [];
    }
  }

  parseMlhDate(dateStr) {
    try {
      const parts = dateStr.split('-').map(p => p.trim());
      if (parts.length === 2) {
        const [start, end] = parts;
        const [startMonth, startDay] = start.split(' ');
        const [endDay, endYear] = end.split(',').map(p => p.trim());
        
        const startDate = new Date(`${startMonth} ${startDay}, ${endYear}`);
        const endDate = new Date(`${startMonth} ${endDay}, ${endYear}`);
        
        return [
          this.formatDate(startDate.toLocaleDateString()),
          this.formatDate(endDate.toLocaleDateString())
        ];
      }
      return [this.formatDate(dateStr), this.formatDate(dateStr)];
    } catch (error) {
      console.error('Error parsing MLH date:', error);
      return [dateStr, dateStr];
    }
  }

  parseEventbriteDate(dateStr) {
    try {
      // Handle various Eventbrite date formats
      const dateRegex = /([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?/;
      const match = dateStr.match(dateRegex);
      
      if (match) {
        const [_, month, day, year = new Date().getFullYear()] = match;
        const date = new Date(`${month} ${day}, ${year}`);
        const formattedDate = this.formatDate(date.toLocaleDateString());
        return [formattedDate, formattedDate];
      }
      
      return [dateStr, dateStr];
    } catch (error) {
      console.error('Error parsing Eventbrite date:', error);
      return [dateStr, dateStr];
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
      console.log('Retrieved hackathons from memory:', {
        count: hackathons.length,
        sampleDates: hackathons.slice(0, 3).map(h => ({
          title: h.title,
          startDate: h.startDate,
          rawStartDate: h.originalStartDate,
          endDate: h.endDate,
          rawEndDate: h.originalEndDate
        }))
      });

      if (hackathons.length === 0) {
        console.log('No hackathons found in memory. Initiating crawl...');
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