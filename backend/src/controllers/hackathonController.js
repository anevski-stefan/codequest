const HackathonService = require('../services/hackathonService');

const hackathonService = new HackathonService();

exports.getHackathons = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, source } = req.query;
    
    // If initial crawl isn't complete, return a specific status
    if (!hackathonService.getInitialCrawlStatus()) {
      return res.status(202).json({
        status: 'initializing',
        message: 'Data is being loaded, please try again in a moment',
        hackathons: [] // Add empty array to prevent undefined
      });
    }

    let hackathons = hackathonService.getAllHackathons();
    
    // Ensure hackathons is always an array
    hackathons = hackathons || [];
    
    console.log(`Fetching hackathons - Total available: ${hackathons.length}`);

    if (search) {
      const searchLower = search.toLowerCase();
      hackathons = hackathons.filter(h => 
        h.title.toLowerCase().includes(searchLower) ||
        h.description.toLowerCase().includes(searchLower)
      );
    }

    if (source) {
      hackathons = hackathons.filter(h => h.source === source);
    }

    // Sort by start date
    hackathons.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // Manual pagination
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginatedHackathons = hackathons.slice(start, start + parseInt(limit));

    return res.json({
      hackathons: paginatedHackathons, // Ensure we're sending an array under 'hackathons' key
      totalPages: Math.ceil(hackathons.length / parseInt(limit)),
      currentPage: parseInt(page),
      totalHackathons: hackathons.length
    });
  } catch (error) {
    console.error('Error in /api/hackathons:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch hackathons',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      hackathons: [] // Add empty array to prevent undefined
    });
  }
};