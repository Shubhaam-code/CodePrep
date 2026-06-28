const axios = require('axios');

/**
 * Build the GitHub URL for the given repo, taking care to URL-encode each
 * path segment (e.g. dots / dashes are fine, but spaces must be encoded).
 */
const repoUrl = (username, repo, ...rest) => {
  const segments = [username, repo, ...rest].filter(Boolean).map((s) => encodeURIComponent(s));
  return `https://api.github.com/repos/${segments.join('/')}`;
};

const publicRepoUrl = (username, repo) =>
  `https://github.com/${encodeURIComponent(username)}/${encodeURIComponent(repo)}`;

const classifyGitHubError = (error, fallback = 'GitHub request failed.') => {
  if (!error.response) {
    return {
      code: 'NETWORK_ERROR',
      status: 0,
      message: 'Network error while contacting GitHub. Please try again.',
    };
  }

  const status = error.response.status;
  const apiMessage = error.response.data?.message;

  if (status === 401) {
    return {
      code: 'TOKEN_EXPIRED',
      status,
      message: 'GitHub authorization expired. Reconnect GitHub and try again.',
    };
  }
  if (status === 403) {
    const remaining = error.response.headers?.['x-ratelimit-remaining'];
    return {
      code: remaining === '0' ? 'RATE_LIMITED' : 'GITHUB_FORBIDDEN',
      status,
      message: remaining === '0'
        ? 'GitHub rate limit reached. Please try again later.'
        : apiMessage || 'GitHub rejected the request. Check repository permissions and reconnect if needed.',
    };
  }
  if (status === 422 && /already exists/i.test(apiMessage || '')) {
    return {
      code: 'REPOSITORY_ALREADY_EXISTS',
      status,
      message: 'Repository already exists on GitHub.',
    };
  }

  return {
    code: 'GITHUB_API_ERROR',
    status,
    message: apiMessage || fallback,
  };
};

/**
 * Check if a repository exists for the user.
 * @param {string} username - User's GitHub username
 * @param {string} token - User's GitHub access token
 * @param {string} repo - Repository name (e.g. "company-preparation")
 * @returns {Promise<boolean>}
 */
const checkRepositoryExists = async (username, token, repo = 'CodePrep-Companies') => {
  console.log(`[GitHub Repo Service] Checking if repository "${repo}" exists for user "${username}"...`);
  try {
    await axios.get(repoUrl(username, repo), {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'CodePrep-AI',
        Accept: 'application/vnd.github+json',
      },
    });
    console.log(`[GitHub Repo Service] Verification success: repository "${repo}" exists.`);
    return true; // Repository exists
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`[GitHub Repo Service] Verification success: repository "${repo}" does not exist.`);
      return false; // Repository does not exist
    }
    console.error(`[GitHub Repo Service] Verification failed for repository "${repo}":`, error.message);
    throw error; // Other error
  }
};

/**
 * Create a new repository with the given name.
 * @param {string} token - User's GitHub access token
 * @param {string} repo - Repository name to create
 * @returns {Promise<object>} - Repository details
 */
const createRepository = async (token, repo = 'CodePrep-Companies') => {
  console.log(`[GitHub Repo Service] Creating new public repository "${repo}" on GitHub...`);
  const response = await axios.post(
    'https://api.github.com/user/repos',
    {
      name: repo,
      description: `CodePrep ${repo} repository (auto-created)`,
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
  console.log(`[GitHub Repo Service] Successfully created repository "${repo}".`);
  return response.data;
};

const ensureRepositoryExists = async (username, token, repo = 'CodePrep-Companies') => {
  const exists = await checkRepositoryExists(username, token, repo);
  if (exists) {
    return {
      exists: true,
      created: false,
      repositoryUrl: publicRepoUrl(username, repo),
    };
  }

  try {
    const createdRepo = await createRepository(token, repo);
    return {
      exists: true,
      created: true,
      repositoryUrl: createdRepo.html_url || publicRepoUrl(username, repo),
    };
  } catch (error) {
    const classified = classifyGitHubError(error, 'Failed to create repository on GitHub.');
    if (classified.code === 'REPOSITORY_ALREADY_EXISTS') {
      return {
        exists: true,
        created: false,
        repositoryUrl: publicRepoUrl(username, repo),
      };
    }
    error.githubError = classified;
    throw error;
  }
};

/**
 * Check if a file exists in the repository using the Contents API.
 * @param {string} username - GitHub username
 * @param {string} token - GitHub access token
 * @param {string} path - File path in the repository (e.g. "Google/.gitkeep")
 * @param {string} [repo] - Repository name (defaults to "company-preparation")
 * @returns {Promise<boolean>}
 */
const checkFileExists = async (username, token, path, repo = 'CodePrep-Companies') => {
  try {
    await axios.get(repoUrl(username, repo, 'contents', path), {
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
 * Create a file in the repository using the Contents API.
 * @param {string} username - GitHub username
 * @param {string} token - GitHub access token
 * @param {string} path - File path in the repository (e.g. "Google/.gitkeep")
 * @param {string} message - Commit message
 * @param {string} content - Base64 encoded file content
 * @param {string} [repo] - Repository name (defaults to "CodePrep-Companies")
 * @returns {Promise<object>}
 */
const createFile = async (username, token, path, message, content, repo = 'CodePrep-Companies') => {
  const response = await axios.put(
    repoUrl(username, repo, 'contents', path),
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
 * Get details of a file in the repository (e.g. to retrieve the sha for updating).
 * @param {string} username - GitHub username
 * @param {string} token - GitHub access token
 * @param {string} path - File path in the repository
 * @param {string} [repo] - Repository name (defaults to "CodePrep-Companies")
 * @returns {Promise<object|null>}
 */
const getFileDetails = async (username, token, path, repo = 'CodePrep-Companies') => {
  try {
    const response = await axios.get(repoUrl(username, repo, 'contents', path), {
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
 * Create or update a file in the repository using the Contents API.
 * @param {string} username - GitHub username
 * @param {string} token - GitHub access token
 * @param {string} path - File path in the repository (e.g. "Google/TwoSum.cpp")
 * @param {string} message - Commit message
 * @param {string} content - Base64 encoded file content
 * @param {string|null} [sha] - Optional SHA of the existing file (required for updates)
 * @param {string} [repo] - Repository name (defaults to "CodePrep-Companies")
 * @returns {Promise<object>}
 */
const createOrUpdateFile = async (
  username,
  token,
  path,
  message,
  content,
  sha = null,
  repo = 'CodePrep-Companies'
) => {
  const body = {
    message,
    content,
  };
  if (sha) {
    body.sha = sha;
  }

  const response = await axios.put(
    repoUrl(username, repo, 'contents', path),
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
  classifyGitHubError,
  checkRepositoryExists,
  createRepository,
  ensureRepositoryExists,
  checkFileExists,
  createFile,
  getFileDetails,
  createOrUpdateFile,
};
