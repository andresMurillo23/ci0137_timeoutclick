const session = require('express-session');

/**
 * Express session configuration with memory store for development
 * Will use MongoDB store once database is connected
 */
const sessionConfig = session({
  secret: process.env.SESSION_SECRET || 'development-secret',
  resave: false,
  saveUninitialized: false,
  name: process.env.SESSION_NAME || 'sessionId',
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
});

module.exports = sessionConfig;