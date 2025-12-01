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
const io = initializeSocket(server);

// Make io accessible to other modules
app.set('socketio', io);

app.use(cors({
  origin: `http://localhost:${process.env.FRONTEND_PORT || 5000}`,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.use('/uploads', express.static('uploads'));

const { errorHandler, notFound } = require('./middleware/errorHandler');

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
  console.log(`Socket.IO enabled for real-time gaming`);
});