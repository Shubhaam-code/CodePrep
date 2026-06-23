const jwt = require('jsonwebtoken');
const githubAuthService = require('../services/githubAuthService');
const User = require('../models/User');

/**
 * Redirect user to GitHub OAuth authorization URL
 * GET /api/auth/github
 */
exports.redirectToGithub = (req, res) => {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      console.error('GITHUB_CLIENT_ID is not configured in the environment.');
      return res.status(500).json({ message: 'GitHub OAuth is not configured on the server.' });
    }

    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: Missing auth token' });
    }

    let state;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      state = decoded.id;
    } catch (err) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const scope = 'repo read:user user:email';

    // Construct the GitHub authorization URL using the URL API (handles encoding properly)
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('state', state);

    return res.redirect(authUrl.toString());
  } catch (error) {
    console.error('Error in redirectToGithub:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

/**
 * Handle GitHub OAuth callback
 * GET /api/auth/github/callback
 */
exports.handleGithubCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Bad Request: Authorization code is missing.',
      });
    }

    if (!state) {
      return res.status(400).json({
        success: false,
        message: 'Bad Request: OAuth state (userId) is missing.',
      });
    }

    // 1. Find user first to ensure they exist before calling GitHub API
    let user;
    try {
      user = await User.findById(state);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found.',
        });
      }
    } catch (err) {
      console.error('Error finding user by state ID:', err.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid user session ID in OAuth state.',
      });
    }

    // 2. Exchange code for access token
    let accessToken;
    try {
      accessToken = await githubAuthService.exchangeCodeForToken(code);
    } catch (err) {
      console.error('Error exchanging code for token:', err.message);
      return res.status(400).json({
        success: false,
        message: 'Failed to authenticate with GitHub: ' + err.message,
      });
    }

    // 3. Fetch user profile from GitHub
    let profile;
    try {
      profile = await githubAuthService.fetchUserProfile(accessToken);
    } catch (err) {
      console.error('Error fetching user profile:', err.message);
      return res.status(400).json({
        success: false,
        message: 'Failed to retrieve user profile from GitHub.',
      });
    }

    const githubId = profile.id;
    const githubUsername = profile.login;

    if (!githubId || !githubUsername) {
      return res.status(400).json({
        success: false,
        message: 'Failed to retrieve necessary user profile information from GitHub.',
      });
    }

    // 4. Save to database
    try {
      user.githubId = String(githubId);
      user.githubUsername = githubUsername;
      user.githubAccessToken = accessToken;
      user.githubConnected = true;
      
      // Also optionally set githubProfileUrl if it exists on profile
      if (profile.html_url) {
        user.githubProfileUrl = profile.html_url;
      }
      
      await user.save();
    } catch (dbErr) {
      console.error('Error saving GitHub details to database:', dbErr);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while saving GitHub connection details.',
      });
    }

    // 5. Return success JSON
    return res.status(200).json({
      success: true,
      githubConnected: true,
      githubUsername,
    });
  } catch (error) {
    console.error('Callback error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};
