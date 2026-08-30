const HackathonService = require('../services/hackathonService');
const hackathonService = new HackathonService();
exports.getHackathons = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      source,
      filter = 'all'
    } = req.query;
    let hackathons = await hackathonService.getAllHackathons();
    const now = new Date();
    if (search) {
      const searchLower = search.toLowerCase();
      hackathons = hackathons.filter(h => h.title?.toLowerCase().includes(searchLower) || h.description?.toLowerCase().includes(searchLower));
    }
    if (source) {
      hackathons = hackathons.filter(h => h.source === source);
    }
    switch (filter) {
      case 'active':
        hackathons = hackathons.filter(h => {
          const startDate = new Date(h.startDate);
          const endDate = new Date(h.endDate);
          return startDate <= now && endDate >= now;
        });
        break;
      case 'upcoming':
          hackathons = hackathons.filter(h => {
            const startDate = new Date(h.startDate);
            return startDate > now;
          });
          break;
      case 'past':
        hackathons = hackathons.filter(h => {
          const endDate = new Date(h.endDate);
          return endDate < now;
        });
        break;
    }
    hackathons.sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateA - dateB;
    });
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginatedHackathons = hackathons.slice(start, start + parseInt(limit));
    return res.json({
      hackathons: paginatedHackathons,
      totalPages: Math.ceil(hackathons.length / parseInt(limit)),
      currentPage: parseInt(page),
      totalHackathons: hackathons.length,
      isLoading: !hackathonService.getInitialCrawlStatus()
    });
  } catch (error) {
    console.error('Error in /api/hackathons:', error);
    return res.status(500).json({
      error: 'Failed to fetch hackathons',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      hackathons: []
    });
  }
};
exports.getHackathonById = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const hackathon = await hackathonService.getHackathonById(id);
    if (!hackathon) {
      return res.status(404).json({
        error: 'Hackathon not found'
      });
    }
    res.json(hackathon);
  } catch (error) {
    console.error('Error fetching hackathon:', error);
    res.status(500).json({
      error: 'Failed to fetch hackathon'
    });
  }
};
exports.createHackathon = async (req, res) => {
  try {
    const sanitized = sanitizeHackathonData(req.body);
    if (sanitized === null) {
      return res.status(400).json({
        error: 'Invalid hackathon data'
      });
    }
    const hackathonData = {
      ...sanitized,
      source: 'manual',
      created_at: new Date().toISOString()
    };
    const newHackathon = await hackathonService.createHackathon(hackathonData);
    res.status(201).json(newHackathon);
  } catch (error) {
    console.error('Error creating hackathon:', error);
    res.status(500).json({
      error: 'Failed to create hackathon'
    });
  }
};
exports.updateHackathon = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const sanitized = sanitizeHackathonData(req.body);
    if (sanitized === null) {
      return res.status(400).json({
        error: 'Invalid hackathon data'
      });
    }
    const updatedHackathon = await hackathonService.updateHackathon(id, {
      ...sanitized,
      updated_at: new Date().toISOString()
    });
    if (!updatedHackathon) {
      return res.status(404).json({
        error: 'Hackathon not found'
      });
    }
    res.json(updatedHackathon);
  } catch (error) {
    console.error('Error updating hackathon:', error);
    res.status(500).json({
      error: 'Failed to update hackathon'
    });
  }
};
exports.deleteHackathon = async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const success = await hackathonService.deleteHackathon(id);
    if (!success) {
      return res.status(404).json({
        error: 'Hackathon not found'
      });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting hackathon:', error);
    res.status(500).json({
      error: 'Failed to delete hackathon'
    });
  }
};
const STRING_FIELDS = ['title', 'description', 'startDate', 'endDate', 'url', 'location', 'prize', 'submissionPeriod'];
const TAGS_FIELD = 'tags';
function sanitizeHackathonData(body) {
  if (!body || typeof body !== 'object') return null;
  const result = {};
  for (const field of STRING_FIELDS) {
    const value = body[field];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'string') return null;
      result[field] = value.trim();
    }
  }
  if (body[TAGS_FIELD] !== undefined && body[TAGS_FIELD] !== null) {
    if (!Array.isArray(body[TAGS_FIELD]) || body[TAGS_FIELD].some(tag => typeof tag !== 'string')) {
      return null;
    }
    result[TAGS_FIELD] = body[TAGS_FIELD].map(tag => tag.trim()).filter(Boolean);
  }
  return result;
}