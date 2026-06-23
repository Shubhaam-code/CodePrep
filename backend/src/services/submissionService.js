const Submission = require('../models/Submission');
const Question = require('../models/Question');
const CompanyQuestion = require('../models/CompanyQuestion');
const User = require('../models/User');
const githubRepositoryService = require('./githubRepositoryService');

/**
 * Save a submission and push it to GitHub if connected
 * @param {string} userId 
 * @param {string} questionId 
 * @param {string} code 
 * @param {string} language 
 * @returns {Promise<object>}
 */
const saveSubmissionAndPush = async (userId, questionId, code, language) => {
  // 1. Find question by questionId
  const question = await Question.findById(questionId);
  if (!question) {
    throw new Error('Question not found');
  }

  // 2. Save submission
  const submission = new Submission({
    userId,
    questionId,
    code,
    language,
    submittedAt: new Date(),
  });
  await submission.save();

  // 3. Find User to check GitHub integration
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  let githubSynced = false;

  // 4. Automatically invoke GitHub push if GitHub is connected
  if (user.githubConnected && user.githubAccessToken && user.githubUsername) {
    const token = user.githubAccessToken;
    const username = user.githubUsername;

    // Determine company
    const companyQuestion = await CompanyQuestion.findOne({ questionId });
    const rawCompany = companyQuestion ? companyQuestion.company : 'general';
    const company = rawCompany.charAt(0).toUpperCase() + rawCompany.slice(1).toLowerCase();
    const questionTitle = question.title;

    try {
      // Verify repository exists
      const repoExists = await githubRepositoryService.checkRepositoryExists(username, token);
      if (repoExists) {
        // Verify company folder exists, auto-create if missing
        const gitkeepPath = `${company}/.gitkeep`;
        let folderExists = false;
        try {
          folderExists = await githubRepositoryService.checkFileExists(username, token, gitkeepPath);
        } catch (err) {
          console.error(`Error checking folder existence during auto-sync for ${company}:`, err.message);
        }

        if (!folderExists) {
          console.log(`Company folder for "${company}" does not exist. Creating automatically...`);
          try {
            const base64Content = Buffer.from('').toString('base64');
            const commitMessage = `Initialize folder structure for ${company} (Auto-created)`;
            await githubRepositoryService.createFile(username, token, gitkeepPath, commitMessage, base64Content);
            console.log(`Successfully created folder for "${company}".`);
            folderExists = true;
          } catch (createErr) {
            console.error(`Failed to automatically create company folder for ${company}:`, createErr.message);
          }
        }

        if (folderExists) {
          // Generate filename
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
          const ext = extensionMap[language.toLowerCase()] || language.toLowerCase();
          const cleanTitle = questionTitle.replace(/[^a-zA-Z0-9]/g, '');
          const filename = `${cleanTitle}.${ext}`;
          const filePath = `${company}/${filename}`;

          // Get existing file SHA if any
          let sha = null;
          try {
            const fileDetails = await githubRepositoryService.getFileDetails(username, token, filePath);
            if (fileDetails) {
              sha = fileDetails.sha;
            }
          } catch (err) {
            console.error('Error fetching file details for sync:', err.message);
          }

          // Push file
          const base64Content = Buffer.from(code).toString('base64');
          const commitMessage = sha 
            ? `Update solution for ${questionTitle} (Auto-sync)` 
            : `Add solution for ${questionTitle} (Auto-sync)`;

          await githubRepositoryService.createOrUpdateFile(username, token, filePath, commitMessage, base64Content, sha);
          githubSynced = true;
        }
      } else {
        console.warn(`GitHub repository "company-preparation" does not exist for user: ${username}`);
      }
    } catch (pushErr) {
      console.error('Failed to auto-sync submission to GitHub:', pushErr.message);
    }
  }

  return {
    submissionSaved: true,
    githubSynced,
  };
};

module.exports = {
  saveSubmissionAndPush,
};
