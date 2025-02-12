const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

class HackathonService {
  constructor() {
    this.hackathons = new Map();
    this.isInitialCrawlComplete = false;
    this.axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    };
    
    this.initialize();
    this.setupCronJob();
  }

  async initialize() {
    try {
      console.log('Starting initial hackathon crawl...');
      await this.crawlAll();
      this.isInitialCrawlComplete = true;
      console.log('Initial crawl complete');
    } catch (error) {
      console.error('Error during initial crawl:', error);
      // Set to true anyway to prevent permanent loading state
      this.isInitialCrawlComplete = true;
    }
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

  async crawlDevpost() {
    try {
      console.log('Crawling Devpost...');
      
      let allHackathons = [];
      let page = 1;
      let hasMorePages = true;

      const baseApiUrl = 'https://devpost.com/api/hackathons';

      while (hasMorePages && page <= 10) {
        console.log(`Fetching page ${page}...`);
        
        const params = {
          page: page,
          status: 'open',
          order_by: 'deadline',
          sort_by: 'deadline'
        };

        try {
          const apiResponse = await axios.get(baseApiUrl, {
            ...this.axiosConfig,
            params: params,
            headers: {
              ...this.axiosConfig.headers,
              'Accept': 'application/json'
            }
          });

          if (!apiResponse.data || !apiResponse.data.hackathons) {
            console.log('No hackathons found in API response');
            break;
          }

          const hackathons = apiResponse.data.hackathons
            .filter(h => {
              const dateStr = h.submission_period_ends_at || h.submission_period_dates?.split(' - ')[1];
              if (!dateStr) return false;
              
              const endDate = new Date(dateStr);
              const now = new Date();
              
              if (endDate.getFullYear() < now.getFullYear()) return false;
              
              return endDate > now;
            })
            .map(h => {
              const processTags = (items) => {
                if (!items) return [];
                if (!Array.isArray(items)) return [];
                return items.map(item => item.name || '').filter(Boolean);
              };

              const themeTags = processTags(h.themes);
              const techTags = processTags(h.technologies);
              const platformTags = processTags(h.platforms);

              const prizeAmount = h.prize_amount ? 
                h.prize_amount.replace(/<[^>]*>/g, '') : 'See website for details';
              
              const startDateStr = h.submission_period_dates?.split(' - ')[0];
              const endDateStr = h.submission_period_dates?.split(' - ')[1];
              
              const formatDate = (dateStr) => {
                if (!dateStr) return '';
                
                console.log('Formatting date:', dateStr);
                
                const getYear = (month) => {
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  const currentMonth = now.getMonth();
                  
                  const monthNum = new Date(Date.parse(month + " 1")).getMonth();
                  
                  if (monthNum < currentMonth) {
                    return currentYear + 1;
                  }
                  return currentYear;
                };

                let fullDateMatch = dateStr.match(/([A-Za-z]+)\s+(\d+),\s+(\d{4})/);
                if (fullDateMatch) {
                  const [_, month, day, year] = fullDateMatch;
                  const date = new Date(`${month} ${day} ${year}`);
                  return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                }

                let shortDateMatch = dateStr.match(/([A-Za-z]+)\s+(\d+)/);
                if (shortDateMatch) {
                  const [_, month, day] = shortDateMatch;
                  const year = getYear(month);
                  const date = new Date(`${month} ${day} ${year}`);
                  return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                }

                console.warn('Failed to parse date:', dateStr);
                return dateStr;
              };
              
              return {
                title: h.title,
                description: h.tagline || h.description || '',
                startDate: formatDate(h.submission_period_dates?.split(' - ')[0]),
                endDate: formatDate(h.submission_period_dates?.split(' - ')[1]),
                url: h.url,
                source: 'devpost',
                location: h.displayed_location?.location || 'Online',
                prize: prizeAmount,
                tags: [...themeTags, ...techTags, ...platformTags],
                rawStartDate: h.submission_period_dates?.split(' - ')[0] || '',
                rawEndDate: h.submission_period_dates?.split(' - ')[1] || ''
              };
            });

          if (hackathons.length > 0) {
            allHackathons = [...allHackathons, ...hackathons];
            console.log(`Found ${hackathons.length} hackathons on page ${page}`);
          }
          
          hasMorePages = hackathons.length > 0;
          page++;

          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error fetching page ${page}:`, error.message);
          break;
        }
      }

      console.log(`Found ${allHackathons.length} active hackathons on Devpost`);
      return allHackathons;
    } catch (error) {
      console.error('Error crawling Devpost:', error.message);
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
      console.log('Starting crawl of all sources...');
      
      const hackathons = await this.retryOperation(() => this.crawlDevpost());
      console.log(`Total hackathons found: ${hackathons.length}`);
      
      this.storeHackathons(hackathons);
      
      return this.getAllHackathons();
    } catch (error) {
      console.error('Error in crawlAll:', error);
      return this.getAllHackathons();
    }
  }

  storeHackathons(hackathons) {
    let count = 0;
    hackathons.forEach(hackathon => {
      if (hackathon.url && !this.hackathons.has(hackathon.url)) {
        this.hackathons.set(hackathon.url, {
          ...hackathon,
          lastUpdated: new Date()
        });
        count++;
      }
    });
    console.log(`Stored ${count} new hackathons`);
  }

  getAllHackathons() {
    return Array.from(this.hackathons.values());
  }

  getInitialCrawlStatus() {
    return this.isInitialCrawlComplete;
  }
}

module.exports = HackathonService; 