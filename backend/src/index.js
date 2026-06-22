const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import Routers
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const userRoutes = require('./routes/user');

const questionRoutes = require('./routes/questions');
const arenaRoutes = require('./routes/arena');
const judgeRoutes = require('./routes/judge');
const gvchallengeRoutes = require('./routes/gvchallenge');

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Bind Socket.io logic
require('./socket')(io);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Set Cross-Origin-Opener-Policy to allow Firebase Auth popups to communicate
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// Welcome / Health Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', message: 'API is operational' });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/user', userRoutes);

app.use('/api/questions', questionRoutes);
app.use('/api/arena', arenaRoutes);
app.use('/api/judge', judgeRoutes);
app.use('/api/gvchallenge', gvchallengeRoutes);

// Arena Match History Endpoint (inline, no exam dependency)
const authMiddleware = require('./middleware/auth');

app.get('/api/history', authMiddleware, async (req, res) => {
  try {
    // Return empty array since exam sessions are removed
    res.status(200).json([]);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ message: 'Server error fetching history' });
  }
});

// Serve frontend static build files in production mode
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

// Listen on PORT
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
