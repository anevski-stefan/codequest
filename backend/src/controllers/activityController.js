const axios = require('axios');

exports.getActivity = async (req, res) => {
  try {
    const response = await axios.get('https://api.github.com/users/me/events', {
      headers: {
        Authorization: `token ${req.user.accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    
    const activities = response.data.map(event => ({
      id: event.id,
      type: event.type,
      repo: event.repo.name,
      date: event.created_at,
      payload: event.payload
    }));

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity:', error.response?.data);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
}; 