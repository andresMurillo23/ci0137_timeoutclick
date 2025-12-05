const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
require('dotenv').config();

const connectDB = require('./config/database');
const routes = require('./routes');

const app = express();
const server = createServer(app);

connectDB();

// Initialize Socket.IO (no session middleware needed)
const { initializeSocket } = require('./socket');
const { io, socketManager } = initializeSocket(server);

// Make io and socketManager accessible to other modules
app.set('socketio', io);
app.set('socketManager', socketManager);

// Manual CORS headers to ensure proper configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  const allowedOrigins = [
    `http://localhost:${process.env.FRONTEND_PORT || 5000}`,
    'http://localhost:3000',
    'http://localhost:5000',
    'https://ci0137-timeoutclick.vercel.app'
  ];
  
  // Log CORS info for debugging
  console.log(`[CORS] ${req.method} ${req.path} - Origin: ${origin || 'none'}`);
  
  // Only set CORS headers if origin exists
  if (origin) {
    const isAllowed = allowedOrigins.includes(origin) || origin.includes('ngrok');
    
    if (isAllowed) {
      console.log(`[CORS] Allowing origin: ${origin}`);
      
      // Force override ngrok headers using writeHead hook
      const originalWriteHead = res.writeHead;
      res.writeHead = function(...args) {
        this.setHeader('Access-Control-Allow-Origin', origin);
        this.setHeader('Access-Control-Allow-Credentials', 'true');
        this.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        this.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        
        console.log(`[CORS] Headers being sent:`, {
          'Access-Control-Allow-Origin': this.getHeader('Access-Control-Allow-Origin'),
          'Access-Control-Allow-Credentials': this.getHeader('Access-Control-Allow-Credentials')
        });
        
        return originalWriteHead.apply(this, args);
      };
      
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    } else {
      console.log(`[CORS] Blocked origin: ${origin}`);
    }
  }
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] Preflight request handled`);
    return res.status(204).end();
  }
  
  // Hook into response finish to log final headers
  res.on('finish', () => {
    if (req.method !== 'OPTIONS') {
      console.log(`[CORS] Response sent for ${req.method} ${req.path}`, {
        'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials')
      });
    }
  });
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.use('/uploads', express.static('uploads'));

const { errorHandler, notFound } = require('./middleware/errorHandler');

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
  console.log(`Socket.IO enabled for real-time gaming`);
  
  // Clean up all active/starting games on server restart
  try {
    const Game = require('./models/Game');
    const GameSession = require('./models/GameSession');
    
    const result = await Game.updateMany(
      { status: { $in: ['waiting', 'starting', 'active'] } },
      { 
        status: 'cancelled',
        gameEndedAt: new Date(),
        cancelReason: 'server_restart'
      }
    );
    
    await GameSession.deleteMany({});
    
    console.log(`[SERVER] Cleaned up ${result.modifiedCount} active games from previous session`);
  } catch (error) {
    console.error('[SERVER] Error cleaning up games:', error);
  }
});