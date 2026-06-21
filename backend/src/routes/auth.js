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
        streak: savedUser.streak
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
        streak: user.streak
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
        streak: user.streak
      }
    });
  } catch (error) {
    console.error('[Backend Auth] Firebase Auth route error during verification/processing:', error);
    res.status(401).json({ message: 'Unauthorized: Invalid Firebase token' });
  }
});

module.exports = router;
