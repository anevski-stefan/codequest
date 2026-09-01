const HackathonService = require('../services/hackathonService');
const logger = require('../utils/logger');
const hackathonService = new HackathonService();
const MAX_PAGE_SIZE = 50;
exports.getHackathons = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      source,
      filter = 'all'
    } = req.query;
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(limit) || 10));
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
    const start = (parsedPage - 1) * parsedLimit;
    const paginatedHackathons = hackathons.slice(start, start + parsedLimit);
    return res.json({
      hackathons: paginatedHackathons,
      totalPages: Math.ceil(hackathons.length / parsedLimit),
      currentPage: parsedPage,
      totalHackathons: hackathons.length,
      isLoading: !hackathonService.getInitialCrawlStatus()
    });
  } catch (error) {
    logger.error('Error in /api/hackathons:', error);
    return res.status(500).json({
      error: 'Failed to fetch hackathons',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
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
    logger.error('Error fetching hackathon:', error);
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
    logger.error('Error creating hackathon:', error);
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
    logger.error('Error updating hackathon:', error);
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
    logger.error('Error deleting hackathon:', error);
    res.status(500).json({
      error: 'Failed to delete hackathon'
    });
  }
};
const STRING_FIELDS = ['title', 'description', 'startDate', 'endDate', 'url', 'location', 'prize', 'submissionPeriod'];
const MAX_FIELD_LENGTH = {
  title: 200,
  description: 5000,
  location: 200,
  prize: 500,
  url: 2048,
  startDate: 100,
  endDate: 100,
  submissionPeriod: 500
};
const TAGS_FIELD = 'tags';
function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
}
function sanitizeHackathonData(body) {
  if (!body || typeof body !== 'object') return null;
  const result = {};
  for (const field of STRING_FIELDS) {
    const value = body[field];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (field === 'url' && trimmed !== '' && !isValidUrl(trimmed)) return null;
      const max = MAX_FIELD_LENGTH[field];
      if (trimmed.length > max) return null;
      result[field] = trimmed;
    }
  }
  if (body[TAGS_FIELD] !== undefined && body[TAGS_FIELD] !== null) {
    if (!Array.isArray(body[TAGS_FIELD]) || body[TAGS_FIELD].some(tag => typeof tag !== 'string')) {
      return null;
    }
    const tags = body[TAGS_FIELD].map(tag => tag.trim()).filter(Boolean);
    if (tags.length > 20 || tags.some(tag => tag.length > 50)) return null;
    result[TAGS_FIELD] = tags;
  }
  return result;
}