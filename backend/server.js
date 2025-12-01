const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
require('dotenv').config();

const connectDB = require('./config/database');
const sessionConfig = require('./config/session');
const routes = require('./routes');

const app = express();
const server = createServer(app);

connectDB();

app.use(cors({
  origin: `http://localhost:${process.env.FRONTEND_PORT || 8080}`,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionConfig);

app.use('/api', routes);

app.use('/uploads', express.static('uploads'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
});