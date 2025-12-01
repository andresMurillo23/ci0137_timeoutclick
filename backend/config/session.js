const session = require('express-session');
const MongoStore = require('connect-mongo');

/**
 * Express session configuration
 * Supports both local MongoDB and Atlas
 */
const createSessionConfig = () => {
  const config = {
    secret: process.env.SESSION_SECRET || 'development-secret',
    resave: false,
    saveUninitialized: false,
    name: process.env.SESSION_NAME || 'sessionId',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
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