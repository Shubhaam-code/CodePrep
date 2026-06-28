const User = require('../models/User');
const Submission = require('../models/Submission');
const CompanyQuestion = require('../models/CompanyQuestion');
const githubRepositoryService = require('../services/githubRepositoryService');
const { REPOS, resolveRepoForContext } = require('../services/contextRepo');

/**
 * Check if the repository exists, and create it if it does not.
 *
 * Accepts an optional `repo` body field (or any of the per-context fields
 * `company` / `challenge` / `pattern` / `sheet`) so the client can create
 * whichever dedicated repository it needs. Defaults to `company-preparation`
 * for backward compatibility with the original single-repo flow.
 *
 * POST /api/github/create-repository
 */
exports.createPrepRepository = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const token = user.githubAccessToken;
    const username = user.githubUsername;

    if (!token || !username || !user.githubConnected) {
      return res.status(400).json({
        success: false,
        message: 'GitHub is not connected for this user.',
      });
    }

    // Decide which repository to create. Explicit `repo` wins; otherwise
    // derive from the supplied context fields; otherwise fall back to the
    // historical default.
    let repo = (req.body && typeof req.body.repo === 'string' && req.body.repo.trim())
      ? req.body.repo.trim()
      : null;
    if (!repo) {
      const { repo: derived } = resolveRepoForContext({
        company: req.body?.company,
        challenge: req.body?.challenge,
        pattern: req.body?.pattern,
        sheet: req.body?.sheet,
      });
      repo = derived;
    }

    // 1. Check if the repository already exists
    let repoExists = false;
    try {
      repoExists = await githubRepositoryService.checkRepositoryExists(username, token, repo);
    } catch (err) {
      const classified = githubRepositoryService.classifyGitHubError(err, 'Failed to verify repository status with GitHub.');
      console.error('Error checking repository existence:', err.response ? err.response.data : err.message);
      return res.status(400).json({
        success: false,
        message: classified.message,
        code: classified.code,
      });
    }

    if (repoExists) {
      const repositoryUrl = `https://github.com/${encodeURIComponent(username)}/${encodeURIComponent(repo)}`;
      if (repo === REPOS.company && user.githubRepositoryUrl !== repositoryUrl) {
        user.githubRepositoryUrl = repositoryUrl;
        await user.save();
      }
      return res.status(200).json({
        success: true,
        repositoryCreated: false,
        repositoryName: repo,
        repositoryUrl,
      });
    }

    // 2. Create the repository since it does not exist
    try {
      const createdRepo = await githubRepositoryService.createRepository(token, repo);
      const repositoryUrl = createdRepo.html_url || `https://github.com/${encodeURIComponent(username)}/${encodeURIComponent(repo)}`;
      if (repo === REPOS.company) {
        user.githubRepositoryUrl = repositoryUrl;
        await user.save();
      }
      return res.status(201).json({
        success: true,
        repositoryCreated: true,
        repositoryName: repo,
        repositoryUrl,
      });
    } catch (err) {
      const classified = githubRepositoryService.classifyGitHubError(err, 'Failed to create repository on GitHub.');
      console.error('Error creating repository:', err.response ? err.response.data : err.message);
      return res.status(400).json({
        success: false,
        message: classified.message,
        code: classified.code,
      });
    }
  } catch (error) {
    console.error('Create repository endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

/**
 * Check if the repository exists, and create a company folder (Google/.gitkeep) if it doesn't.
 * POST /api/github/create-company-folder
 */
exports.createCompanyFolder = async (req, res) => {
  try {
    const { company } = req.body;
    if (!company || typeof company !== 'string' || !company.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Bad Request: Company name is required.',
      });
    }

    const sanitizedCompany = company.trim();
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const token = user.githubAccessToken;
    const username = user.githubUsername;

    if (!token || !username || !user.githubConnected) {
      return res.status(400).json({
        success: false,
        message: 'GitHub is not connected for this user.',
      });
    }

    // 1. Verify if repository exists
    let repoExists = false;
    try {
      repoExists = await githubRepositoryService.checkRepositoryExists(username, token, REPOS.company);
    } catch (err) {
      console.error('Error verifying repository:', err.response ? err.response.data : err.message);
      return res.status(400).json({
        success: false,
        message: 'Failed to verify repository status on GitHub.',
      });
    }

    if (!repoExists) {
      return res.status(400).json({
        success: false,
        message: `Repository "${REPOS.company}" does not exist. Please create the repository first.`,
      });
    }

    // 2. Check if the folder (.gitkeep file) already exists
    const gitkeepPath = `${sanitizedCompany}/.gitkeep`;
    let folderExists = false;
    try {
      folderExists = await githubRepositoryService.checkFileExists(username, token, gitkeepPath, REPOS.company);
    } catch (err) {
      console.error('Error checking folder existence:', err.response ? err.response.data : err.message);
      return res.status(400).json({
        success: false,
        message: 'Failed to verify folder existence on GitHub.',
      });
    }

    if (folderExists) {
      return res.status(200).json({
        success: true,
        folderCreated: false,
        company: sanitizedCompany,
      });
    }

    // 3. Create the folder by creating a .gitkeep file
    try {
      const base64Content = Buffer.from('').toString('base64');
      const commitMessage = `Initialize folder structure for ${sanitizedCompany}`;
      await githubRepositoryService.createFile(username, token, gitkeepPath, commitMessage, base64Content, REPOS.company);

      return res.status(201).json({
        success: true,
        folderCreated: true,
        company: sanitizedCompany,
      });
    } catch (err) {
      console.error('Error creating folder on GitHub:', err.response ? err.response.data : err.message);
      return res.status(400).json({
        success: false,
        message: `Failed to create folder for ${sanitizedCompany} on GitHub.`,
      });
    }
  } catch (error) {
    console.error('Create company folder endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

/**
 * Commit a question solution to the GitHub repository under the company folder.
 * POST /api/github/push-question
 */
exports.pushQuestion = async (req, res) => {
  try {
    const { company, questionTitle, language, code } = req.body;

    if (!company || typeof company !== 'string' || !company.trim()) {
      return res.status(400).json({ success: false, message: 'Bad Request: Company is required.' });
    }
    if (!questionTitle || typeof questionTitle !== 'string' || !questionTitle.trim()) {
      return res.status(400).json({ success: false, message: 'Bad Request: Question title is required.' });
    }
    if (!language || typeof language !== 'string' || !language.trim()) {
      return res.status(400).json({ success: false, message: 'Bad Request: Language is required.' });
    }
    if (code === undefined || code === null || typeof code !== 'string') {
      return res.status(400).json({ success: false, message: 'Bad Request: Code content is required.' });
    }

    const sanitizedCompany = company.trim();
    const sanitizedTitle = questionTitle.trim();
    const sanitizedLang = language.trim();

    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const token = user.githubAccessToken;
    const username = user.githubUsername;

    if (!token || !username || !user.githubConnected) {
      return res.status(400).json({ success: false, message: 'GitHub is not connected for this user.' });
    }

    // 1. Verify if repository exists
    let repoExists = false;
    try {
      repoExists = await githubRepositoryService.checkRepositoryExists(username, token, REPOS.company);
    } catch (err) {
      console.error('Error verifying repository:', err.response ? err.response.data : err.message);
      return res.status(400).json({ success: false, message: 'Failed to verify repository status on GitHub.' });
    }

    if (!repoExists) {
      return res.status(400).json({
        success: false,
        message: `Repository "${REPOS.company}" does not exist. Please create the repository first.`,
      });
    }

    // 2. Verify if company folder exists (indicated by {company}/.gitkeep), auto-create if missing
    const gitkeepPath = `${sanitizedCompany}/.gitkeep`;
    let folderExists = false;
    try {
      folderExists = await githubRepositoryService.checkFileExists(username, token, gitkeepPath, REPOS.company);
    } catch (err) {
      console.error('Error verifying folder existence:', err.response ? err.response.data : err.message);
      return res.status(400).json({ success: false, message: 'Failed to verify company folder status on GitHub.' });
    }

    if (!folderExists) {
      console.log(`Company folder for "${sanitizedCompany}" does not exist on GitHub. Creating automatically...`);
      try {
        const base64Content = Buffer.from('').toString('base64');
        const commitMessage = `Initialize folder structure for ${sanitizedCompany} (Auto-created)`;
        await githubRepositoryService.createFile(username, token, gitkeepPath, commitMessage, base64Content, REPOS.company);
        console.log(`Successfully created folder for "${sanitizedCompany}" on GitHub.`);
        folderExists = true;
      } catch (createErr) {
        console.error(`Failed to automatically create company folder for ${sanitizedCompany}:`, createErr.response ? createErr.response.data : createErr.message);
        return res.status(400).json({
          success: false,
          message: `Failed to automatically create company folder for "${sanitizedCompany}" on GitHub.`,
        });
      }
    }

    // 3. Generate filename
    // Map language name to extension
    const extensionMap = {
      'cpp': 'cpp',
      'c++': 'cpp',
      'java': 'java',
      'python': 'py',
      'python3': 'py',
      'javascript': 'js',
      'js': 'js',
      'typescript': 'ts',
      'ts': 'ts',
      'c': 'c',
      'csharp': 'cs',
      'c#': 'cs',
      'go': 'go',
      'rust': 'rs',
      'ruby': 'rb',
      'swift': 'swift',
      'kotlin': 'kt',
      'scala': 'scala',
      'php': 'php',
      'html': 'html',
      'css': 'css',
      'sql': 'sql'
    };
    
    const ext = extensionMap[sanitizedLang.toLowerCase()] || sanitizedLang.toLowerCase();
    const cleanTitle = sanitizedTitle.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `${cleanTitle}.${ext}`;
    const filePath = `${sanitizedCompany}/${filename}`;

    // 4. Check if the file already exists to retrieve its sha (for updating)
    let sha = null;
    try {
      const fileDetails = await githubRepositoryService.getFileDetails(username, token, filePath, REPOS.company);
      if (fileDetails) {
        sha = fileDetails.sha;
      }
    } catch (err) {
      console.error('Error fetching file details:', err.response ? err.response.data : err.message);
      return res.status(400).json({ success: false, message: 'Failed to verify file status on GitHub.' });
    }

    // 5. Commit/Push the file to GitHub
    try {
      const base64Content = Buffer.from(code).toString('base64');
      const commitMessage = sha 
        ? `Update solution for ${sanitizedTitle}` 
        : `Add solution for ${sanitizedTitle}`;

      await githubRepositoryService.createOrUpdateFile(username, token, filePath, commitMessage, base64Content, sha, REPOS.company);

      return res.status(200).json({
        success: true,
        fileCreated: true,
        path: filePath,
      });
    } catch (err) {
      console.error('Error committing file to GitHub:', err.response ? err.response.data : err.message);
      return res.status(400).json({
        success: false,
        message: `Failed to commit solution file to GitHub.`,
      });
    }
  } catch (error) {
    console.error('Push question endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

/**
 * Get GitHub Stats for the logged-in user.
 * GET /api/github/stats
 */
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const githubConnected = user.githubConnected || false;

    // The legacy single-repo UI shows the company-prep repo as the primary
    // one. We additionally expose the list of all dedicated repos so the
    // client can display / check each one without guessing names.
    const repositoryName = githubConnected ? REPOS.company : null;
    let repositoryUrl = githubConnected ? user.githubRepositoryUrl : null;
    let repositoryExists = false;

    if (githubConnected && user.githubUsername && user.githubAccessToken) {
      try {
        repositoryExists = await githubRepositoryService.checkRepositoryExists(
          user.githubUsername,
          user.githubAccessToken,
          REPOS.company
        );
        if (repositoryExists) {
          repositoryUrl = `https://github.com/${encodeURIComponent(user.githubUsername)}/${encodeURIComponent(REPOS.company)}`;
          if (user.githubRepositoryUrl !== repositoryUrl) {
            user.githubRepositoryUrl = repositoryUrl;
            await user.save();
          }
        } else {
          repositoryUrl = null;
        }
      } catch (err) {
        const classified = githubRepositoryService.classifyGitHubError(err, 'Failed to verify repository status with GitHub.');
        console.error('Error checking GitHub repository in stats:', classified.message);
      }
    }
    // Derive available repositories from solved questions instead of
    // returning all known repos. A repository should only appear after
    // the user has solved at least one question that maps to it.
    const repoSet = new Set();
    for (const sq of user.solvedQuestions || []) {
      const result = resolveRepoForContext({ syncContext: sq.syncContext });
      if (result && result.repo) {
        repoSet.add(result.repo);
      }
    }
    // Stable ordering: preserve the canonical REPOS order
    const availableRepositories = Object.values(REPOS).filter(r => repoSet.has(r));

    // Retrieve all submissions for the logged-in user
    const submissions = await Submission.find({ userId })
      .sort({ submittedAt: -1 })
      .populate('questionId');

    // Extract unique question IDs from submissions
    const solvedQuestionIds = [...new Set(submissions.map(sub => sub.questionId ? sub.questionId._id.toString() : null).filter(Boolean))];
    const totalSolvedQuestions = solvedQuestionIds.length;

    // Calculate unique companies covered directly from submission.company field
    const uniqueCompanies = new Set(
      submissions
        .filter(sub => sub.company)
        .map(sub => sub.company.toLowerCase().trim())
    );
    const totalCompaniesCovered = uniqueCompanies.size;

    // Fetch the last 5 submissions with question details
    const recentSubmissions = [];
    const limitSubmissions = submissions.slice(0, 5);
    for (const sub of limitSubmissions) {
      if (!sub.questionId) continue;
      // Use submission.company directly, fallback to CompanyQuestion lookup for old submissions
      let displayCompany = 'General';
      if (sub.company) {
        displayCompany = sub.company.charAt(0).toUpperCase() + sub.company.slice(1).toLowerCase();
      } else {
        const companyQuestion = await CompanyQuestion.findOne({ questionId: sub.questionId._id });
        if (companyQuestion) {
          displayCompany = companyQuestion.company.charAt(0).toUpperCase() + companyQuestion.company.slice(1).toLowerCase();
        }
      }
      recentSubmissions.push({
        _id: sub._id,
        questionTitle: sub.questionId.title,
        language: sub.language,
        submittedAt: sub.submittedAt,
        company: displayCompany
      });
    }

    // lastSyncAt is the submittedAt of the most recent submission if github is connected
    const lastSyncAt = (githubConnected && submissions.length > 0)
      ? submissions[0].submittedAt
      : null;

    return res.status(200).json({
      githubConnected,
      githubUsername: user.githubUsername || null,
      githubProfileUrl: user.githubProfileUrl || null,
      repositoryName,
      repositoryUrl,
      repositoryExists,
      availableRepositories,
      totalSolvedQuestions,
      totalCompaniesCovered,
      lastSyncAt,
      recentSubmissions
    });
  } catch (error) {
    console.error('Error fetching github stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};
