const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import Routers
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const userRoutes = require('./routes/user');
const githubAuthRoutes = require('./routes/githubAuth');
const githubRepositoryRoutes = require('./routes/githubRepository');
const submissionRoutes = require('./routes/submissions');

const questionRoutes = require('./routes/questions');

const gvchallengeRoutes = require('./routes/gvchallenge');

const app = express();




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
app.use('/api/auth/github', githubAuthRoutes);
app.use('/api/github', githubRepositoryRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/user', userRoutes);

app.use('/api/questions', questionRoutes);

app.use('/api/gvchallenge', gvchallengeRoutes);

// Arena Match History Endpoint (inline, no exam dependency)
const authMiddleware = require('./middleware/auth');


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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
