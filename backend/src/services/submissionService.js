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
 * @param {string|null} company - Optional company name from the frontend
 * @returns {Promise<object>}
 */
const saveSubmissionAndPush = async (userId, questionId, code, language, company = null, challenge = null, day = null, syncContext = null) => {
  // 1. Find question by questionId
  const question = await Question.findById(questionId);
  if (!question) {
    throw new Error('Question not found');
  }

  // 2. Save submission (include company if provided)
  const submission = new Submission({
    userId,
    questionId,
    code,
    language,
    company: company || null,
    submittedAt: new Date(),
  });
  await submission.save();

  // 3. Find User to check GitHub integration
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Update User solvedQuestions if not already solved to maintain MongoDB statistics
  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const currentContext = syncContext || "general";

  const alreadySolved = user.solvedQuestions.some(
    (q) =>
      q.questionId.toString() === questionId.toString() &&
      (q.syncContext || "general") === currentContext
  );

  if (!alreadySolved) {
    const now = new Date();
    user.solvedQuestions.push({
    questionId,
    syncContext: currentContext,
    solvedAt: now
  });
    
    // Streak logic matching user.js
    const lastSolved = user.streak.lastSolvedDate;
    if (!lastSolved) {
      user.streak.current = 1;
    } else {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);

      if (isSameDay(lastSolved, now)) {
        // Solved today; keep current streak
      } else if (isSameDay(lastSolved, yesterday)) {
        // Solved yesterday; increment streak
        user.streak.current += 1;
      } else {
        // Streak broken; reset to 1
        user.streak.current = 1;
      }
    }
    user.streak.lastSolvedDate = now;
    await user.save();
  }

  let githubSynced = false;

  console.log("GitHub Connected:", user.githubConnected);
console.log("GitHub Username:", user.githubUsername);
console.log("Has Token:", !!user.githubAccessToken);

  // 4. Automatically invoke GitHub push if GitHub is connected
  if (user.githubConnected && user.githubAccessToken && user.githubUsername) {
    const token = user.githubAccessToken;
    const username = user.githubUsername;

    const questionTitle = question.title;

    try {
      // Verify repository exists
      const repoExists = await githubRepositoryService.checkRepositoryExists(username, token);
      if (repoExists) {
        let filePath;
        let isReadyToPush = false;
        
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

        if (challenge === 'gv') {
          // Ignore company folder logic and give challenge routing higher priority than company routing
          const sanitizedTitle = questionTitle.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
          filePath = `GVishwanathanChallenge/DAY${Number(day)}/${sanitizedTitle}.${ext}`;
          isReadyToPush = true;
        } else {
          // Determine company folder name: prefer submission company, fallback to CompanyQuestion lookup
          let folderCompany;
          if (company) {
            folderCompany = company.charAt(0).toUpperCase() + company.slice(1).toLowerCase();
          } else {
            const companyQuestion = await CompanyQuestion.findOne({ questionId });
            const rawCompany = companyQuestion ? companyQuestion.company : 'general';
            folderCompany = rawCompany.charAt(0).toUpperCase() + rawCompany.slice(1).toLowerCase();
          }

          // Verify company folder exists, auto-create if missing
          const gitkeepPath = `${folderCompany}/.gitkeep`;
          let folderExists = false;
          try {
            folderExists = await githubRepositoryService.checkFileExists(username, token, gitkeepPath);
          } catch (err) {
            console.error(`Error checking folder existence during auto-sync for ${folderCompany}:`, err.message);
          }

          if (!folderExists) {
            console.log(`Company folder for "${folderCompany}" does not exist. Creating automatically...`);
            try {
              const base64Content = Buffer.from('').toString('base64');
              const commitMessage = `Initialize folder structure for ${folderCompany} (Auto-created)`;
              await githubRepositoryService.createFile(username, token, gitkeepPath, commitMessage, base64Content);
              console.log(`Successfully created folder for "${folderCompany}".`);
              folderExists = true;
            } catch (createErr) {
              console.error(`Failed to automatically create company folder for ${folderCompany}:`, createErr.message);
            }
          }

          if (folderExists) {
            const cleanTitle = questionTitle.replace(/[^a-zA-Z0-9]/g, '');
            const filename = `${cleanTitle}.${ext}`;
            filePath = `${folderCompany}/${filename}`;
            isReadyToPush = true;
          }
        }

        if (isReadyToPush) {
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

          // 5. Update README.md after successful sync
          try {
            console.log('Compiling CodePrep progress and updating README.md...');
            const populatedUser = await User.findById(userId).populate({
              path: 'solvedQuestions.questionId',
              model: 'Question'
            });

            const solvedQuestionIds = populatedUser.solvedQuestions
              .filter(sq => sq.questionId !== null)
              .map(sq => sq.questionId._id);

            const companyQuestions = await CompanyQuestion.find({
              questionId: { $in: solvedQuestionIds }
            }).populate('questionId');

            const totalSolved = populatedUser.solvedQuestions.length;

            const companyMap = {};
            for (const cq of companyQuestions) {
              if (!cq.questionId) continue;
              
              const rawCompany = cq.company || 'general';
              const companyName = rawCompany.charAt(0).toUpperCase() + rawCompany.slice(1).toLowerCase();
              
              if (!companyMap[companyName]) {
                companyMap[companyName] = new Set();
              }
              companyMap[companyName].add(cq.questionId.title);
            }

            // Handle general questions
            const mappedQuestionTitles = new Set(
              companyQuestions
                .filter(cq => cq.questionId !== null)
                .map(cq => cq.questionId.title)
            );
            for (const sq of populatedUser.solvedQuestions) {
              if (!sq.questionId) continue;
              if (!mappedQuestionTitles.has(sq.questionId.title)) {
                if (!companyMap['General']) {
                  companyMap['General'] = new Set();
                }
                companyMap['General'].add(sq.questionId.title);
              }
            }

            // Build README markdown content
            let readmeContent = `# CodePrep Progress\n\nTotal Solved: ${totalSolved}\n`;
            const sortedCompanies = Object.keys(companyMap).sort();
            for (const comp of sortedCompanies) {
              readmeContent += `\n## ${comp}\n\n`;
              const questionsList = Array.from(companyMap[comp]).sort();
              for (const qTitle of questionsList) {
                readmeContent += `* ${qTitle}\n`;
              }
            }

            const readmePath = 'README.md';
            const readmeBase64 = Buffer.from(readmeContent).toString('base64');
            const readmeCommitMsg = 'Update README.md with latest progress (Auto-generated)';

            let readmeSha = null;
            try {
              const readmeDetails = await githubRepositoryService.getFileDetails(username, token, readmePath);
              if (readmeDetails) {
                readmeSha = readmeDetails.sha;
              }
            } catch (err) {
              console.error('Error fetching README details:', err.message);
            }

            await githubRepositoryService.createOrUpdateFile(username, token, readmePath, readmeCommitMsg, readmeBase64, readmeSha);
            console.log('Successfully updated README.md on GitHub.');
          } catch (readmeErr) {
            console.error('Failed to update README.md on GitHub:', readmeErr.message);
          }
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
