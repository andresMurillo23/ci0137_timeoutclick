/**
 * Authentication middleware
 * Validates Bearer token from Authorization header
 * Decodes base64 token to extract user ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = authHeader.substring(7);
    const userId = Buffer.from(token, 'base64').toString('utf8');
    req.userId = userId;
    
    // Also set in session for compatibility with controllers expecting req.session.userId
    if (!req.session) {
      req.session = {};
    }
    req.session.userId = userId;
    
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Optional authentication middleware
 * Continues execution whether user is authenticated or not
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const userId = Buffer.from(token, 'base64').toString('utf8');
      req.userId = userId;
      req.isAuthenticated = true;
    } catch (error) {
      req.isAuthenticated = false;
      req.userId = null;
    }
  } else {
    req.isAuthenticated = false;
    req.userId = null;
  }
  
  next();
};

module.exports = {
  requireAuth,
  optionalAuth
};