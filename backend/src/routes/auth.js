const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { admin, isInitialized } = require('../config/firebase');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/**
 * @route   POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash
    });

    const savedUser = await newUser.save();
    const token = generateToken(savedUser._id);

    res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        solvedQuestions: savedUser.solvedQuestions,
        bookmarks: savedUser.bookmarks,
        streak: savedUser.streak,
        githubConnected: savedUser.githubConnected,
        githubUsername: savedUser.githubUsername,
        githubProfileUrl: savedUser.githubProfileUrl,
        githubRepositoryUrl: savedUser.githubRepositoryUrl,
        linkedinConnected: savedUser.linkedinConnected,
        linkedinProfileUrl: savedUser.linkedinProfileUrl,
        isOnboarded: savedUser.isOnboarded
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.passwordHash) {
      return res.status(400).json({ message: 'This account was registered using Google. Please log in using Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        solvedQuestions: user.solvedQuestions,
        bookmarks: user.bookmarks,
        streak: user.streak,
        githubConnected: user.githubConnected,
        githubUsername: user.githubUsername,
        githubProfileUrl: user.githubProfileUrl,
        githubRepositoryUrl: user.githubRepositoryUrl,
        linkedinConnected: user.linkedinConnected,
        linkedinProfileUrl: user.linkedinProfileUrl,
        isOnboarded: user.isOnboarded
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/auth/firebase
 * @desc    Authenticate with Firebase ID Token (Google OAuth)
 * @access  Public
 */
router.post('/firebase', async (req, res) => {
  console.log('[Backend Auth] Received POST request on /api/auth/firebase');
  try {
    if (!isInitialized()) {
      console.error('[Backend Auth] Firebase Admin SDK is not initialized. Request rejected.');
      return res.status(503).json({ message: 'Firebase Authentication is not configured or failed to initialize on the server.' });
    }

    const { idToken } = req.body;

    if (!idToken) {
      console.warn('[Backend Auth] Missing idToken in request body.');
      return res.status(400).json({ message: 'Firebase idToken is required' });
    }

    console.log('[Backend Auth] Verifying Firebase ID Token (truncated):', idToken.substring(0, 30) + '...');
    
    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    console.log('[Backend Auth] Token verified successfully. User details extracted:', { uid, email, name });

    if (!email) {
      console.error('[Backend Auth] Email address missing in Firebase ID token.');
      return res.status(400).json({ message: 'Email not provided by Google account' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    console.log('[Backend Auth] Querying MongoDB for user with uid:', uid, 'or email:', normalizedEmail);
    // Find user by firebaseUid or email
    let user = await User.findOne({
      $or: [
        { firebaseUid: uid },
        { email: normalizedEmail }
      ]
    });

    if (!user) {
      console.log('[Backend Auth] User not found. Creating new MongoDB user document.');
      // Create new user if not found
      user = new User({
        name: name || 'Google User',
        email: normalizedEmail,
        firebaseUid: uid
      });
      await user.save();
      console.log('[Backend Auth] New MongoDB user created with ID:', user._id);
    } else {
      console.log('[Backend Auth] User found in MongoDB with ID:', user._id);
      if (!user.firebaseUid) {
        console.log('[Backend Auth] Linking firebaseUid to existing user profile.');
        // Link Firebase Uid if they previously signed up via email/password
        user.firebaseUid = uid;
        await user.save();
        console.log('[Backend Auth] User profile updated successfully with firebaseUid.');
      }
    }

    // Generate JWT
    console.log('[Backend Auth] Generating local session JWT for user ID:', user._id);
    const token = generateToken(user._id);

    console.log('[Backend Auth] Sending successful auth response payload.');
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        solvedQuestions: user.solvedQuestions,
        bookmarks: user.bookmarks,
        streak: user.streak,
        githubConnected: user.githubConnected,
        githubUsername: user.githubUsername,
        githubProfileUrl: user.githubProfileUrl,
        githubRepositoryUrl: user.githubRepositoryUrl,
        linkedinConnected: user.linkedinConnected,
        linkedinProfileUrl: user.linkedinProfileUrl,
        isOnboarded: user.isOnboarded
      }
    });
  } catch (error) {
    console.error('[Backend Auth] Firebase Auth route error during verification/processing:', error);
    res.status(401).json({ message: 'Unauthorized: Invalid Firebase token' });
  }
});

const authMiddleware = require('../middleware/auth');

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/auth/github
 * @desc    Mock GitHub OAuth consent page
 * @access  Public
 */
router.get('/github', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(401).send('Unauthorized: Missing auth token');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorize CodePrep AI</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          body { background-color: #0B0B0F; color: #F1F5F9; font-family: sans-serif; }
        </style>
      </head>
      <body class="flex items-center justify-center min-h-screen">
        <div class="max-w-md w-full p-8 bg-[#0F0F1A] border border-white/10 rounded-3xl shadow-2xl text-center space-y-6">
          <div class="flex items-center justify-center gap-6">
            <svg class="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            <span class="text-2xl text-gray-500">↔</span>
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FFB800] flex items-center justify-center text-black font-extrabold text-sm shadow-lg shadow-[#FF7A00]/20">CP</div>
          </div>
          <h2 class="text-xl font-bold">Authorize CodePrep AI</h2>
          <p class="text-sm text-gray-400">CodePrep AI would like permission to access your public GitHub profile details.</p>
          <div class="border-t border-white/5 pt-4 text-left text-xs text-gray-500 space-y-2.5">
            <div class="flex items-center gap-2">
              <span class="text-green-500">✔</span>
              <span>Access your GitHub username (<b>mock_github_user</b>)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-green-500">✔</span>
              <span>View your public profile link</span>
            </div>
          </div>
          <div class="flex gap-3 pt-4">
            <button onclick="window.close()" class="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition">Cancel</button>
            <a href="/api/auth/github/callback?code=mock-code&state=${userId}" class="flex-1 py-2.5 bg-[#22C55E] hover:bg-opacity-90 text-black font-extrabold rounded-xl text-xs text-center transition">Authorize</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('GitHub init error:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * @route   GET /api/auth/github/callback
 * @desc    Mock GitHub OAuth callback
 * @access  Public
 */
router.get('/github/callback', async (req, res) => {
  try {
    const { state } = req.query;
    if (!state) {
      return res.status(400).send('Bad Request: Missing state');
    }

    const user = await User.findById(state);
    if (!user) {
      return res.status(404).send('User not found');
    }

    user.githubConnected = true;
    user.githubUsername = 'mock_github_user';
    user.githubProfileUrl = 'https://github.com/mock_github_user';
    await user.save();

    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Connecting...</title></head>
      <body>
        <p style="text-align:center; font-family:sans-serif; color:#94A3B8; margin-top:40px;">Successfully authorized! Connecting your profile...</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth-success', provider: 'github' }, '*');
          }
          window.close();
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('GitHub callback error:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * @route   GET /api/auth/linkedin
 * @desc    Mock LinkedIn OAuth consent page
 * @access  Public
 */
router.get('/linkedin', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(401).send('Unauthorized: Missing auth token');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorize CodePrep AI</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          body { background-color: #0B0B0F; color: #F1F5F9; font-family: sans-serif; }
        </style>
      </head>
      <body class="flex items-center justify-center min-h-screen">
        <div class="max-w-md w-full p-8 bg-[#0F0F1A] border border-white/10 rounded-3xl shadow-2xl text-center space-y-6">
          <div class="flex items-center justify-center gap-6">
            <svg class="w-12 h-12 text-[#0077B5]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.23 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.2 0 22.23 0zM7.12 20.45H3.56V9H7.12v11.45zM5.34 7.43c-1.14 0-2.06-.92-2.06-2.06 0-1.14.92-2.06 2.06-2.06 1.14 0 2.06.92 2.06 2.06 0 1.14-.92 2.06-2.06 2.06zm15.11 13.02h-3.56v-5.6c0-1.34-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95v5.7h-3.56V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29z"/>
            </svg>
            <span class="text-2xl text-gray-500">↔</span>
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FFB800] flex items-center justify-center text-black font-extrabold text-sm shadow-lg shadow-[#FF7A00]/20">CP</div>
          </div>
          <h2 class="text-xl font-bold">Authorize CodePrep AI</h2>
          <p class="text-sm text-gray-400">CodePrep AI would like permission to access your LinkedIn profile details.</p>
          <div class="border-t border-white/5 pt-4 text-left text-xs text-gray-500 space-y-2.5">
            <div class="flex items-center gap-2">
              <span class="text-green-500">✔</span>
              <span>Access your LinkedIn profile details</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-green-500">✔</span>
              <span>View your public profile link (<b>mock_linkedin_user</b>)</span>
            </div>
          </div>
          <div class="flex gap-3 pt-4">
            <button onclick="window.close()" class="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition">Cancel</button>
            <a href="/api/auth/linkedin/callback?code=mock-code&state=${userId}" class="flex-1 py-2.5 bg-[#0077B5] hover:bg-opacity-90 text-white font-extrabold rounded-xl text-xs text-center transition">Authorize</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('LinkedIn init error:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * @route   GET /api/auth/linkedin/callback
 * @desc    Mock LinkedIn OAuth callback
 * @access  Public
 */
router.get('/linkedin/callback', async (req, res) => {
  try {
    const { state } = req.query;
    if (!state) {
      return res.status(400).send('Bad Request: Missing state');
    }

    const user = await User.findById(state);
    if (!user) {
      return res.status(404).send('User not found');
    }

    user.linkedinConnected = true;
    user.linkedinProfileUrl = 'https://www.linkedin.com/in/mock_linkedin_user';
    await user.save();

    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Connecting...</title></head>
      <body>
        <p style="text-align:center; font-family:sans-serif; color:#94A3B8; margin-top:40px;">Successfully authorized! Connecting your profile...</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth-success', provider: 'linkedin' }, '*');
          }
          window.close();
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * @route   POST /api/auth/onboarding/complete
 * @desc    Mark onboarding as completed for current user
 * @access  Private
 */
router.post('/onboarding/complete', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.isOnboarded = true;
    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        solvedQuestions: user.solvedQuestions,
        bookmarks: user.bookmarks,
        streak: user.streak,
        githubConnected: user.githubConnected,
        githubUsername: user.githubUsername,
        githubProfileUrl: user.githubProfileUrl,
        githubRepositoryUrl: user.githubRepositoryUrl,
        linkedinConnected: user.linkedinConnected,
        linkedinProfileUrl: user.linkedinProfileUrl,
        isOnboarded: user.isOnboarded
      }
    });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
