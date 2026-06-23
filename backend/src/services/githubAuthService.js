const axios = require('axios');

/**
 * Exchange OAuth authorization code for an access token
 * @param {string} code 
 * @returns {Promise<string>} accessToken
 */
const exchangeCodeForToken = async (code) => {
  const response = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    },
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (response.data && response.data.access_token) {
    return response.data.access_token;
  }

  throw new Error(response.data.error_description || response.data.error || 'Failed to exchange authorization code for access token');
};

/**
 * Fetch GitHub user profile using access token
 * @param {string} accessToken 
 * @returns {Promise<object>} profile
 */
const fetchUserProfile = async (accessToken) => {
  const response = await axios.get('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'CodePrep-AI',
    },
  });

  return response.data;
};

module.exports = {
  exchangeCodeForToken,
  fetchUserProfile,
};
