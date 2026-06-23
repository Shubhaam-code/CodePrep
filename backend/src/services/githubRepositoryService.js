const axios = require('axios');

/**
 * Check if the repository "company-preparation" exists for the user
 * @param {string} username - User's GitHub username
 * @param {string} token - User's GitHub access token
 * @returns {Promise<boolean>}
 */
const checkRepositoryExists = async (username, token) => {
  try {
    await axios.get(`https://api.github.com/repos/${username}/company-preparation`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'CodePrep-AI',
        Accept: 'application/vnd.github+json',
      },
    });
    return true; // Repository exists
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return false; // Repository does not exist
    }
    throw error; // Other error
  }
};

/**
 * Create a new repository "company-preparation"
 * @param {string} token - User's GitHub access token
 * @returns {Promise<object>} - Repository details
 */
const createRepository = async (token) => {
  const response = await axios.post(
    'https://api.github.com/user/repos',
    {
      name: 'company-preparation',
      description: 'CodePrep automatic preparation repository',
      private: false,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'CodePrep-AI',
        Accept: 'application/vnd.github+json',
      },
    }
  );
  return response.data;
};

/**
 * Check if a file exists in the repository using the Contents API
 * @param {string} username - GitHub username
 * @param {string} token - GitHub access token
 * @param {string} path - File path in the repository (e.g. "Google/.gitkeep")
 * @returns {Promise<boolean>}
 */
const checkFileExists = async (username, token, path) => {
  try {
    await axios.get(`https://api.github.com/repos/${username}/company-preparation/contents/${encodeURIComponent(path)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'CodePrep-AI',
        Accept: 'application/vnd.github+json',
      },
    });
    return true; // File exists
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return false; // File does not exist
    }
    throw error;
  }
};

/**
 * Create a file in the repository using the Contents API
 * @param {string} username - GitHub username
 * @param {string} token - GitHub access token
 * @param {string} path - File path in the repository (e.g. "Google/.gitkeep")
 * @param {string} message - Commit message
 * @param {string} content - Base64 encoded file content
 * @returns {Promise<object>}
 */
const createFile = async (username, token, path, message, content) => {
  const response = await axios.put(
    `https://api.github.com/repos/${username}/company-preparation/contents/${encodeURIComponent(path)}`,
    {
      message,
      content,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'CodePrep-AI',
        Accept: 'application/vnd.github+json',
      },
    }
  );
  return response.data;
};

/**
 * Get details of a file in the repository (e.g. to retrieve the sha for updating)
 * @param {string} username - GitHub username
 * @param {string} token - GitHub access token
 * @param {string} path - File path in the repository
 * @returns {Promise<object|null>}
 */
const getFileDetails = async (username, token, path) => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${username}/company-preparation/contents/${encodeURIComponent(path)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'CodePrep-AI',
        Accept: 'application/vnd.github+json',
      },
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Create or update a file in the repository using the Contents API
 * @param {string} username - GitHub username
 * @param {string} token - GitHub access token
 * @param {string} path - File path in the repository (e.g. "Google/TwoSum.cpp")
 * @param {string} message - Commit message
 * @param {string} content - Base64 encoded file content
 * @param {string} [sha] - Optional SHA of the existing file (required for updates)
 * @returns {Promise<object>}
 */
const createOrUpdateFile = async (username, token, path, message, content, sha = null) => {
  const body = {
    message,
    content,
  };
  if (sha) {
    body.sha = sha;
  }

  const response = await axios.put(
    `https://api.github.com/repos/${username}/company-preparation/contents/${encodeURIComponent(path)}`,
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'CodePrep-AI',
        Accept: 'application/vnd.github+json',
      },
    }
  );
  return response.data;
};

module.exports = {
  checkRepositoryExists,
  createRepository,
  checkFileExists,
  createFile,
  getFileDetails,
  createOrUpdateFile,
};
