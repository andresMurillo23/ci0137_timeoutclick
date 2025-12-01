/**
 * Authentication middleware
 * Checks if user has valid session
 */
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
};

/**
 * Optional authentication middleware
 * Continues execution whether user is authenticated or not
 */
const optionalAuth = (req, res, next) => {
  req.isAuthenticated = !!(req.session && req.session.userId);
  req.userId = req.session?.userId || null;
  next();
};

module.exports = {
  requireAuth,
  optionalAuth
};