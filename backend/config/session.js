const session = require('express-session');
const MongoStore = require('connect-mongo');

/**
 * Express session configuration
 * Supports both local MongoDB and Atlas
 */
const createSessionConfig = () => {
  const isDev = process.env.NODE_ENV !== 'production';
  
  const config = {
    secret: process.env.SESSION_SECRET || 'development-secret',
    resave: false,
    saveUninitialized: false,
    name: process.env.SESSION_NAME || 'sessionId',
    cookie: {
      secure: false, // Always false for local development
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/'
    }
  };

  if (process.env.MONGODB_URI) {
    config.store = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      touchAfter: 24 * 3600,
      ttl: 24 * 60 * 60,
      crypto: {
        secret: process.env.SESSION_SECRET || 'development-secret'
      }
    });
  }

  return session(config);
};

module.exports = createSessionConfig();