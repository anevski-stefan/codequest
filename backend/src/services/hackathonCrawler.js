const axios = require('axios');
const cheerio = require('cheerio');

class HackathonCrawler {
  constructor() {
    this.hackathons = new Map();
    this.axiosConfig = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    };
  }

  async crawlDevpost() {
    try {
      console.log('Crawling Devpost...');
      
      let allHackathons = [];
      let page = 1;
      let hasMorePages = true;

      // Base URL for the API
      const baseApiUrl = 'https://devpost.com/api/hackathons';

      while (hasMorePages && page <= 10) { // Limit to 10 pages for testing
        console.log(`Fetching page ${page}...`);
        
        const params = {
          page: page,
          status: 'open',  // First try just open hackathons
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
              // Parse the end date string properly
              const dateStr = h.submission_period_ends_at || h.submission_period_dates?.split(' - ')[1];
              if (!dateStr) return false;
              
              // Convert date string to Date object
              const endDate = new Date(dateStr);
              const now = new Date();
              
              // Validate the year is current or future
              if (endDate.getFullYear() < now.getFullYear()) return false;
              
              // Check if the hackathon hasn't ended yet
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
              
              // Parse and format dates
              const startDateStr = h.submission_period_dates?.split(' - ')[0];
              const endDateStr = h.submission_period_dates?.split(' - ')[1];
              
              const formatDate = (dateStr) => {
                if (!dateStr) return '';
                
                console.log('Formatting date:', dateStr);
                
                // Helper to get the appropriate year
                const getYear = (month) => {
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  const currentMonth = now.getMonth(); // 0-11
                  
                  // Convert month name to number (0-11)
                  const monthNum = new Date(Date.parse(month + " 1")).getMonth();
                  
                  // If the month is earlier than current month, use next year
                  // This handles cases like if it's December and we see "Jan 15"
                  if (monthNum < currentMonth) {
                    return currentYear + 1;
                  }
                  return currentYear;
                };

                // Handle "MMM DD, YYYY" format
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

                // Handle "MMM DD" format (no year)
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

                // If we can't parse the date, return the original string
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
                // Add raw dates for debugging
                rawStartDate: h.submission_period_dates?.split(' - ')[0] || '',
                rawEndDate: h.submission_period_dates?.split(' - ')[1] || ''
              };
            });

          if (hackathons.length > 0) {
            allHackathons = [...allHackathons, ...hackathons];
            console.log(`Found ${hackathons.length} hackathons on page ${page}`);
          }
          
          // Check if there are more pages
          hasMorePages = hackathons.length > 0;
          page++;

          // Add a small delay between requests
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
      
      // Store the hackathons
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
}

module.exports = HackathonCrawler; 