const requireAdmin = (req, res, next) => {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) {
    console.warn('ADMIN_EMAILS is not set — admin-only routes will deny everyone');
    return res.status(403).json({ error: 'Forbidden: admin access not configured' });
  }
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!adminEmails.includes(req.user.email.toLowerCase())) {
    return res.status(403).json({ error: 'Forbidden: admin access required' });
  }
  next();
};
module.exports = requireAdmin;
