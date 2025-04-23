const HackathonService = require('../services/hackathonService');
const hackathonService = new HackathonService();

exports.getHackathons = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, source, filter = 'all' } = req.query;
    console.log('Request params:', { page, limit, search, source, filter });
    
    let hackathons = await hackathonService.getAllHackathons();
    console.log('Initial hackathons count:', hackathons.length);

    const now = new Date();
    console.log('Current date:', now.toISOString());

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      hackathons = hackathons.filter(h => 
        h.title?.toLowerCase().includes(searchLower) ||
        h.description?.toLowerCase().includes(searchLower)
      );
    }

    if (source) {
      hackathons = hackathons.filter(h => h.source === source);
    }

    // Filter based on status
    switch (filter) {
      case 'active':
        hackathons = hackathons.filter(h => {
          const startDate = new Date(h.startDate);
          const endDate = new Date(h.endDate);
          return startDate <= now && endDate >= now;
        });
        break;
      case 'upcoming':
        console.log('Before upcoming filter:', hackathons.length);
        hackathons = hackathons.filter(h => {
          const startDate = new Date(h.startDate);
          const isUpcoming = startDate > now;
          console.log({
            title: h.title,
            startDate: h.startDate,
            parsedStartDate: startDate,
            currentDate: now,
            isUpcoming
          });
          return isUpcoming;
        });
        console.log('After upcoming filter:', hackathons.length);
        break;
      case 'past':
        hackathons = hackathons.filter(h => {
          const endDate = new Date(h.endDate);
          return endDate < now;
        });
        break;
    }

    // Sort by start date
    hackathons.sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateA - dateB;
    });

    // Pagination
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

exports.getAllHackathons = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hackathons')
      .select('*');
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching hackathons:', error);
    res.status(500).json({ error: 'Failed to fetch hackathons' });
  }
};

exports.getHackathonById = async (req, res) => {
  try {
    const { id } = req.params;
    const hackathon = await hackathonService.getHackathonById(id);
    
    if (!hackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }
    
    res.json(hackathon);
  } catch (error) {
    console.error('Error fetching hackathon:', error);
    res.status(500).json({ error: 'Failed to fetch hackathon' });
  }
};

exports.createHackathon = async (req, res) => {
  try {
    const hackathonData = {
      ...req.body,
      source: 'manual',
      created_at: new Date().toISOString()
    };
    
    const newHackathon = await hackathonService.createHackathon(hackathonData);
    res.status(201).json(newHackathon);
  } catch (error) {
    console.error('Error creating hackathon:', error);
    res.status(500).json({ error: 'Failed to create hackathon' });
  }
};

exports.updateHackathon = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedHackathon = await hackathonService.updateHackathon(id, {
      ...req.body,
      updated_at: new Date().toISOString()
    });
    
    if (!updatedHackathon) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }
    
    res.json(updatedHackathon);
  } catch (error) {
    console.error('Error updating hackathon:', error);
    res.status(500).json({ error: 'Failed to update hackathon' });
  }
};

exports.deleteHackathon = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await hackathonService.deleteHackathon(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting hackathon:', error);
    res.status(500).json({ error: 'Failed to delete hackathon' });
  }
};