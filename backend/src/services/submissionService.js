const Submission = require('../models/Submission');
const Question = require('../models/Question');
const CompanyQuestion = require('../models/CompanyQuestion');
const User = require('../models/User');
const GVChallenge = require('../models/GVChallenge');
const githubRepositoryService = require('./githubRepositoryService');
const { resolveRepoForContext } = require('./contextRepo');

/**
 * Save a submission and push it to GitHub if connected.
 *
 * Solutions are routed to a dedicated GitHub repository based on the
 * learning context:
 *   - GV Challenge      → gvishwanathan-challenge
 *   - Pattern roadmap   → DSA-Patterns
 *   - Sheet roadmap     → sheet-roadmap
 *   - Company questions → company-preparation
 *   - General           → general-prep
 *
 * @param {string} userId
 * @param {string} questionId
 * @param {string} code
 * @param {string} language
 * @param {string|null} [company]    - Optional company name from the frontend
 * @param {string|null} [challenge]  - Challenge tag (e.g. "gv")
 * @param {number|null} [day]        - Day number for GV challenge
 * @param {string|null} [pattern]    - DSA pattern slug
 * @param {string|null} [sheet]      - Sheet slug
 * @param {string|null} [syncContext] - Pre-computed syncContext token
 * @returns {Promise<object>}
 */
const saveSubmissionAndPush = async (
  userId,
  questionId,
  code,
  language,
  company = null,
  challenge = null,
  day = null,
  syncContext = null,
  pattern = null,
  sheet = null
) => {
  // 1. Find question by questionId
  const question = await Question.findById(questionId);
  if (!question) {
    throw new Error('Question not found');
  }

  // ── Roadmap pattern auto-detection ─────────────────────────────────
  // If the caller did not explicitly supply a pattern slug but the
  // question itself is tagged with a roadmap pattern (via the
  // roadmapPattern field on the Question document), derive the slug
  // from the document.  This lets the front-end send only questionId
  // and code without manually repeating the pattern — the back-end
  // resolves it from the question's own metadata.
  if (!pattern && question.roadmapPattern) {
    pattern = question.roadmapPattern;
  }

  // When a roadmap pattern is active (either supplied or auto-detected)
  // and no syncContext was given, build a context token that keeps
  // the "already solved" deduplication scoped to this pattern.
  if (pattern && !syncContext) {
    syncContext = `pattern_${pattern}`;
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

    // For GV Challenge syncs, also append a row to the GVChallenge
    // collection. This is the collection /api/gvchallenge/progress
    // reads from to compute totalCompleted + currentStreak, so it's
    // what makes the day advance on the GV Challenge page after an
    // Extension sync. Without this write, the GV page would never
    // see the solve (it's intentionally decoupled from
    // user.solvedQuestions). The user.solvedQuestions push above
    // remains the source for the dashboard's totalSolved.
    if (challenge === 'gv' && Number.isFinite(Number(day)) && Number(day) > 0) {
      try {
        const dayExists = await GVChallenge.findOne({
          userId,
          dayNumber: Number(day),
        });
        if (!dayExists) {
          await GVChallenge.create({
            userId,
            dayNumber: Number(day),
            questionTitle: question.title,
            questionUrl: question.leetcodeUrl || '',
            completedAt: now,
            linkedinPosted: false,
          });
        }
      } catch (gvErr) {
        console.error(`Failed to record GVChallenge row for Day ${day}:`, gvErr.message);
      }
    }

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
  let githubSyncError = null;

  console.log("GitHub Connected:", user.githubConnected);
console.log("GitHub Username:", user.githubUsername);
console.log("Has Token:", !!user.githubAccessToken);

  // 4. Automatically invoke GitHub push if GitHub is connected
  if (user.githubConnected && user.githubAccessToken && user.githubUsername) {
    const token = user.githubAccessToken;
    const username = user.githubUsername;

    const questionTitle = question.title;

    // Resolve which dedicated repositories this submission belongs to.
    const targetRepos = [];
    const primaryRepoInfo = resolveRepoForContext({
      company,
      challenge,
      pattern,
      sheet,
      syncContext,
    });
    targetRepos.push({
      repo: primaryRepoInfo.repo,
      context: primaryRepoInfo.context,
    });

    if (question.roadmapPattern && primaryRepoInfo.repo !== 'DSA-Patterns') {
      targetRepos.push({
        repo: 'DSA-Patterns',
        context: 'pattern',
      });
    }

    for (const target of targetRepos) {
      const repo = target.repo;
      const context = target.context;

      try {
        // Ensure repository exists on GitHub
        let repoExists = false;
        try {
          const ensuredRepo = await githubRepositoryService.ensureRepositoryExists(username, token, repo);
          repoExists = ensuredRepo.exists;
          if (
            repo === 'company-preparation' &&
            ensuredRepo.repositoryUrl &&
            user.githubRepositoryUrl !== ensuredRepo.repositoryUrl
          ) {
            user.githubRepositoryUrl = ensuredRepo.repositoryUrl;
            await user.save();
          }
        } catch (err) {
          const classified = err.githubError || githubRepositoryService.classifyGitHubError(err, `Failed to prepare repository "${repo}".`);
          githubSyncError = classified.message;
          console.error(`Error preparing repository ${repo}:`, classified.message);
        }

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

          if (repo === 'DSA-Patterns') {
            const patternSlug = question.roadmapPattern || pattern;
            if (patternSlug) {
              const gitkeepPath = `${patternSlug}/.gitkeep`;
              let folderReady = false;
              try {
                const exists = await githubRepositoryService.checkFileExists(
                  username, token, gitkeepPath, repo
                );
                folderReady = !!exists;
              } catch (_) {}

              if (!folderReady) {
                try {
                  const base64Content = Buffer.from('').toString('base64');
                  await githubRepositoryService.createFile(
                    username, token, gitkeepPath,
                    `Initialize ${patternSlug} folder (Auto-created)`,
                    base64Content, repo
                  );
                  folderReady = true;
                } catch (err) {
                  console.error(
                    `Failed to create pattern folder "${patternSlug}" in ${repo}:`,
                    err.message
                  );
                }
              }

              if (folderReady) {
                const sanitizedTitle = questionTitle.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
                filePath = `${patternSlug}/${sanitizedTitle}.${ext}`;
                isReadyToPush = true;
              }
            }
          } else if (context === 'gv') {
            const rootFolder = 'GVishwanathanChallenge';
            const dayFolder  = `DAY${Number(day)}`;

            const ensureFolder = async (folderPath) => {
              const gitkeepPath = `${folderPath}/.gitkeep`;
              try {
                const exists = await githubRepositoryService.checkFileExists(
                  username,
                  token,
                  gitkeepPath,
                  repo
                );
                if (exists) return true;
              } catch (err) {
                console.error(`Error checking folder existence for ${folderPath}:`, err.message);
                return false;
              }

              try {
                const base64Content = Buffer.from('').toString('base64');
                const commitMessage = `Initialize ${folderPath} folder (Auto-created)`;
                await githubRepositoryService.createFile(
                  username,
                  token,
                  gitkeepPath,
                  commitMessage,
                  base64Content,
                  repo
                );
                console.log(`Auto-created folder "${folderPath}" in ${repo}.`);
                return true;
              } catch (err) {
                console.error(`Failed to auto-create folder "${folderPath}" in ${repo}:`, err.message);
                return false;
              }
            };

            const rootReady = await ensureFolder(rootFolder);
            const dayReady  = rootReady ? await ensureFolder(`${rootFolder}/${dayFolder}`) : false;

            if (dayReady) {
              const sanitizedTitle = questionTitle.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
              filePath = `${rootFolder}/${dayFolder}/${sanitizedTitle}.${ext}`;
              isReadyToPush = true;
            }
          } else if (context === 'pattern') {
            const patternSlug = pattern;
            if (patternSlug) {
              const gitkeepPath = `${patternSlug}/.gitkeep`;
              let folderReady = false;
              try {
                const exists = await githubRepositoryService.checkFileExists(
                  username, token, gitkeepPath, repo
                );
                folderReady = !!exists;
              } catch (_) {}

              if (!folderReady) {
                try {
                  const base64Content = Buffer.from('').toString('base64');
                  await githubRepositoryService.createFile(
                    username, token, gitkeepPath,
                    `Initialize ${patternSlug} folder (Auto-created)`,
                    base64Content, repo
                  );
                  folderReady = true;
                } catch (err) {
                  console.error(
                    `Failed to create pattern folder "${patternSlug}" in ${repo}:`,
                    err.message
                  );
                }
              }

              if (folderReady) {
                const sanitizedTitle = questionTitle.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
                filePath = `${patternSlug}/${sanitizedTitle}.${ext}`;
                isReadyToPush = true;
              }
            }
          } else if (context === 'sheet') {
            const sanitizedTitle = questionTitle.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
            filePath = `${sheet}/${sanitizedTitle}.${ext}`;
            isReadyToPush = true;
          } else {
            let folderCompany;
            if (company) {
              folderCompany = company.charAt(0).toUpperCase() + company.slice(1).toLowerCase();
            } else {
              const companyQuestion = await CompanyQuestion.findOne({ questionId });
              const rawCompany = companyQuestion ? companyQuestion.company : 'general';
              folderCompany = rawCompany.charAt(0).toUpperCase() + rawCompany.slice(1).toLowerCase();
            }

            const gitkeepPath = `${folderCompany}/.gitkeep`;
            let folderExists = false;
            try {
              folderExists = await githubRepositoryService.checkFileExists(username, token, gitkeepPath, repo);
            } catch (err) {
              console.error(`Error checking folder existence during auto-sync for ${folderCompany}:`, err.message);
            }

            if (!folderExists) {
              console.log(`Company folder for "${folderCompany}" does not exist in ${repo}. Creating automatically...`);
              try {
                const base64Content = Buffer.from('').toString('base64');
                const commitMessage = `Initialize folder structure for ${folderCompany} (Auto-created)`;
                await githubRepositoryService.createFile(username, token, gitkeepPath, commitMessage, base64Content, repo);
                console.log(`Successfully created folder for "${folderCompany}" in ${repo}.`);
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
            let fileExistsOnGitHub = false;
            if (alreadySolved) {
              try {
                const existing = await githubRepositoryService.getFileDetails(
                  username,
                  token,
                  filePath,
                  repo
                );
                fileExistsOnGitHub = !!existing;
              } catch (probeErr) {
                console.error(
                  `Error probing ${filePath} on ${repo}; defaulting to push attempt:`,
                  probeErr.message
                );
              }
              if (fileExistsOnGitHub) {
                console.log(
                  `Skipping GitHub push: ${filePath} already exists in ${repo} and day is already solved in MongoDB.`
                );
                isReadyToPush = false;
              }
            }
          }

          if (isReadyToPush) {
            let sha = null;
            try {
              const fileDetails = await githubRepositoryService.getFileDetails(username, token, filePath, repo);
              if (fileDetails) {
                sha = fileDetails.sha;
              }
            } catch (err) {
              console.error('Error fetching file details for sync:', err.message);
            }

            const base64Content = Buffer.from(code).toString('base64');
            const commitMessage = sha
              ? `Update solution for ${questionTitle} (Auto-sync)`
              : `Add solution for ${questionTitle} (Auto-sync)`;

            await githubRepositoryService.createOrUpdateFile(username, token, filePath, commitMessage, base64Content, sha, repo);
            githubSynced = true;

            try {
              console.log(`Compiling ${repo} progress and updating README.md...`);
              const { getReadmeGenerator } = require('./readme');
              const generator = getReadmeGenerator(repo);
              const readmeData = await generator.getData(userId);
              const readmeContent = generator.generateReadme(readmeData, repo);

              const readmePath = 'README.md';
              const readmeBase64 = Buffer.from(readmeContent).toString('base64');
              const readmeCommitMsg = 'Update README.md with latest progress (Auto-generated)';

              let readmeSha = null;
              try {
                const readmeDetails = await githubRepositoryService.getFileDetails(username, token, readmePath, repo);
                if (readmeDetails) {
                  readmeSha = readmeDetails.sha;
                }
              } catch (err) {
                console.error('Error fetching README details:', err.message);
              }

              await githubRepositoryService.createOrUpdateFile(username, token, readmePath, readmeCommitMsg, readmeBase64, readmeSha, repo);
              console.log(`Successfully updated README.md in ${repo}.`);
            } catch (readmeErr) {
              console.error(`Failed to update README.md in ${repo}:`, readmeErr.message);
            }
          }
        } else {
          console.warn(`GitHub repository "${repo}" does not exist for user: ${username}`);
        }
      } catch (repoErr) {
        console.error(`Error processing target repo ${repo}:`, repoErr.message);
      }
    }
  }

  return {
    submissionSaved: true,
    githubSynced,
    githubSyncError,
  };
};

module.exports = {
  saveSubmissionAndPush,
};
