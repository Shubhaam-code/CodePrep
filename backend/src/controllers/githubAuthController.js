const jwt = require('jsonwebtoken');
const githubAuthService = require('../services/githubAuthService');
const User = require('../models/User');

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const oauthPopupResponse = ({ success, message, githubUsername, githubProfileUrl }) => {
  const payload = JSON.stringify({
    type: success ? 'oauth-success' : 'oauth-error',
    provider: 'github',
    success,
    message,
    githubConnected: success,
    githubUsername: githubUsername || null,
    githubProfileUrl: githubProfileUrl || null,
  });

  const title = success ? 'GitHub connected' : 'GitHub connection failed';
  const body = success
    ? 'GitHub connected successfully. You can close this window.'
    : message || 'GitHub connection failed. You can close this window.';
  const targetOrigin = process.env.FRONTEND_URL || process.env.CLIENT_URL || '*';

  return `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0B0B0F; color: #F1F5F9; font-family: Arial, sans-serif; }
    .box { max-width: 420px; padding: 28px; text-align: center; border: 1px solid rgba(255,255,255,.1); border-radius: 16px; background: #0F0F1A; }
    p { color: #94A3B8; font-size: 14px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="box">
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(body)}</p>
  </div>
  <script>
    const payload = ${payload};
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, ${JSON.stringify(targetOrigin)});
    }
    setTimeout(() => window.close(), 250);
  </script>
</body>
</html>`;
};

const sendOAuthPopupResponse = (res, payload, status = 200) => {
  res.status(status).type('html').send(oauthPopupResponse(payload));
};

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
    const { code, state, error, error_description } = req.query;

    if (error) {
      return sendOAuthPopupResponse(res, {
        success: false,
        message: error_description || 'GitHub authorization was cancelled.',
      }, 400);
    }

    if (!code) {
      return sendOAuthPopupResponse(res, {
        success: false,
        message: 'Bad Request: Authorization code is missing.',
      }, 400);
    }

    if (!state) {
      return sendOAuthPopupResponse(res, {
        success: false,
        message: 'Bad Request: OAuth state (userId) is missing.',
      }, 400);
    }

    // 1. Find user first to ensure they exist before calling GitHub API
    let user;
    try {
      user = await User.findById(state);
      if (!user) {
        return sendOAuthPopupResponse(res, {
          success: false,
          message: 'User not found.',
        }, 404);
      }
    } catch (err) {
      console.error('Error finding user by state ID:', err.message);
      return sendOAuthPopupResponse(res, {
        success: false,
        message: 'Invalid user session ID in OAuth state.',
      }, 400);
    }

    // 2. Exchange code for access token
    let accessToken;
    try {
      accessToken = await githubAuthService.exchangeCodeForToken(code);
    } catch (err) {
      console.error('Error exchanging code for token:', err.message);
      return sendOAuthPopupResponse(res, {
        success: false,
        message: 'Failed to authenticate with GitHub: ' + err.message,
      }, 400);
    }

    // 3. Fetch user profile from GitHub
    let profile;
    try {
      profile = await githubAuthService.fetchUserProfile(accessToken);
    } catch (err) {
      console.error('Error fetching user profile:', err.message);
      return sendOAuthPopupResponse(res, {
        success: false,
        message: 'Failed to retrieve user profile from GitHub.',
      }, 400);
    }

    const githubId = profile.id;
    const githubUsername = profile.login;

    if (!githubId || !githubUsername) {
      return sendOAuthPopupResponse(res, {
        success: false,
        message: 'Failed to retrieve necessary user profile information from GitHub.',
      }, 400);
    }

    // 4. Save to database
    try {
      user.githubId = String(githubId);
      user.githubUsername = githubUsername;
      user.githubAccessToken = accessToken;
      user.githubConnected = true;
      user.githubProfileUrl = profile.html_url || `https://github.com/${githubUsername}`;
      
      await user.save();
    } catch (dbErr) {
      console.error('Error saving GitHub details to database:', dbErr);
      return sendOAuthPopupResponse(res, {
        success: false,
        message: 'Internal server error while saving GitHub connection details.',
      }, 500);
    }

    // 5. Notify the opener and close the popup. Repository creation is lazy
    // and happens during the first successful GitHub sync, not here.
    return sendOAuthPopupResponse(res, {
      success: true,
      githubUsername,
      githubProfileUrl: user.githubProfileUrl,
    });
  } catch (error) {
    console.error('Callback error:', error);
    return sendOAuthPopupResponse(res, {
      success: false,
      message: 'Internal Server Error',
    }, 500);
  }
};
