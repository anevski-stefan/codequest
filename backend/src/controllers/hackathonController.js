const HackathonService = require('../services/hackathonService');
const supabaseService = require('../services/supabaseService');

const hackathonService = new HackathonService();

exports.getHackathons = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, source } = req.query;
    
    if (!hackathonService.getInitialCrawlStatus()) {
      return res.status(202).json({
        status: 'initializing',
        message: 'Data is being loaded, please try again in a moment',
        hackathons: [] 
      });
    }

    let hackathons = hackathonService.getAllHackathons();
    
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

    hackathons.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginatedHackathons = hackathons.slice(start, start + parseInt(limit));

    return res.json({
      hackathons: paginatedHackathons, 
      totalPages: Math.ceil(hackathons.length / parseInt(limit)),
      currentPage: parseInt(page),
      totalHackathons: hackathons.length
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
    const { data, error } = await supabaseService.from('hackathons').select('*');
    
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
    const { data, error } = await supabaseService
      .from('hackathons')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching hackathon:', error);
    res.status(500).json({ error: 'Failed to fetch hackathon' });
  }
};

exports.createHackathon = async (req, res) => {
  try {
    const { title, description, startDate, endDate } = req.body;
    
    const { data, error } = await supabaseService
      .from('hackathons')
      .insert([{ title, description, start_date: startDate, end_date: endDate }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating hackathon:', error);
    res.status(500).json({ error: 'Failed to create hackathon' });
  }
};

exports.updateHackathon = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, startDate, endDate } = req.body;
    
    const { data, error } = await supabaseService
      .from('hackathons')
      .update({ title, description, start_date: startDate, end_date: endDate })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Hackathon not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error updating hackathon:', error);
    res.status(500).json({ error: 'Failed to update hackathon' });
  }
};

exports.deleteHackathon = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabaseService
      .from('hackathons')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting hackathon:', error);
    res.status(500).json({ error: 'Failed to delete hackathon' });
  }
};