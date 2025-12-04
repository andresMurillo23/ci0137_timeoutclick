const express = require('express');
const router = express.Router();

/**
 * Main API router
 * Combines all route modules
 */

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/friends', require('./friends'));
router.use('/games', require('./games'));

/**
 * API health check
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TimeoutClick API is running',
    timestamp: new Date().toISOString(),
    session: req.session?.userId ? 'Authenticated' : 'Guest'
  });
});

module.exports = router;