const Submission = require('../models/Submission');
const Question = require('../models/Question');
const CompanyQuestion = require('../models/CompanyQuestion');
const User = require('../models/User');
const GVChallenge = require('../models/GVChallenge');
const githubRepositoryService = require('./githubRepositoryService');
const { REPOS, resolveRepoForContext } = require('./contextRepo');

/**
 * Save a submission and push it to GitHub if connected.
 *
 * Solutions are routed to a dedicated GitHub repository based on the
 * learning context:
 *   - GV Challenge      → gv-challenge
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

  // 1. Resolve syncContext and select repository based ONLY on explicit request params
  let resolvedSyncContext = syncContext;
  let reason = 'Explicit syncContext from request';

  if (!resolvedSyncContext) {
    if (challenge === 'gv' && day !== undefined && day !== null) {
      resolvedSyncContext = `gv_day${day}`;
      reason = 'Resolved from explicit challenge and day request parameters';
    } else if (pattern) {
      resolvedSyncContext = `pattern_${pattern}`;
      reason = 'Resolved from explicit pattern request parameter';
    } else if (sheet) {
      resolvedSyncContext = `sheet_${sheet}`;
      reason = 'Resolved from explicit sheet request parameter';
    } else if (company) {
      resolvedSyncContext = `company_${company}`;
      reason = 'Resolved from explicit company request parameter';
    } else {
      resolvedSyncContext = 'general';
      reason = 'No context provided, falling back to general';
    }
  }

  const primaryRepoInfo = resolveRepoForContext({ syncContext: resolvedSyncContext });
  const repo = primaryRepoInfo.repo;
  const context = primaryRepoInfo.context;

  console.log(`\n--- [GitHub Sync Context Resolution] ---`);
  console.log(`Incoming syncContext: ${syncContext || 'None'}`);
  console.log(`Resolved syncContext: ${resolvedSyncContext}`);
  console.log(`Detected module:      ${context}`);
  console.log(`Selected repository:  ${repo}`);
  console.log(`Reason for selection: ${reason}`);
  console.log(`----------------------------------------\n`);

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

  const currentContext = resolvedSyncContext || "general";

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
    // Extension sync.
    if (context === 'gv') {
      let resolvedDay = day;
      if (resolvedDay === null || resolvedDay === undefined) {
        const GVChallengeCache = require('../models/GVChallengeCache');
        const cachedChallenge = await GVChallengeCache.findOne().sort({ cachedAt: -1 });
        const gvQuestions = cachedChallenge ? cachedChallenge.questions : [];
        const matchedGv = gvQuestions.find(
          q => q.title.toLowerCase().trim() === question.title.toLowerCase().trim()
        );
        if (matchedGv) {
          resolvedDay = matchedGv.dayNumber;
        }
      }
      if (Number.isFinite(Number(resolvedDay)) && Number(resolvedDay) > 0) {
        try {
          const dayExists = await GVChallenge.findOne({
            userId,
            dayNumber: Number(resolvedDay),
          });
          if (!dayExists) {
            await GVChallenge.create({
              userId,
              dayNumber: Number(resolvedDay),
              questionTitle: question.title,
              questionUrl: question.leetcodeUrl || '',
              completedAt: now,
              linkedinPosted: false,
            });
          }
        } catch (gvErr) {
          console.error(`Failed to record GVChallenge row for Day ${resolvedDay}:`, gvErr.message);
        }
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
    const targetRepos = [{
      repo,
      context,
    }];

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

    const CONTEXT_STRATEGIES = {
      company: {
        getFolderName: async (opts) => {
          let rawCompany;
          let basis = 'Explicit company parameter from request';
          if (opts.company) {
            rawCompany = opts.company;
          } else {
            const companyQuestion = await CompanyQuestion.findOne({ questionId: opts.questionId });
            rawCompany = companyQuestion ? companyQuestion.company : 'general';
            basis = `Fallback lookup in CompanyQuestion metadata (result: ${rawCompany})`;
          }
          const folder = rawCompany.charAt(0).toUpperCase() + rawCompany.slice(1).toLowerCase();
          console.log(`[Folder Selection] Selected folder: "${folder}" (Reason: ${basis})`);
          return folder;
        },
        getFilename: (title, ext) => {
          const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '');
          return `${cleanTitle}.${ext}`;
        }
      },
      pattern: {
        getFolderName: async (opts) => {
          let folder = opts.pattern;
          let basis = 'Explicit pattern parameter from request';
          if (!folder) {
            folder = opts.question.roadmapPattern;
            basis = `Fallback lookup from Question roadmapPattern metadata (result: ${folder})`;
          }
          console.log(`[Folder Selection] Selected folder: "${folder}" (Reason: ${basis})`);
          return folder;
        },
        getFilename: (title, ext) => {
          const sanitizedTitle = title.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
          return `${sanitizedTitle}.${ext}`;
        }
      },
      gv: {
        getFolderName: async (opts) => {
          let resolvedDay = opts.day;
          let basis = 'Explicit day parameter from request';
          if (resolvedDay === null || resolvedDay === undefined) {
            const GVChallengeCache = require('../models/GVChallengeCache');
            const cachedChallenge = await GVChallengeCache.findOne().sort({ cachedAt: -1 });
            const gvQuestions = cachedChallenge ? cachedChallenge.questions : [];
            const matchedGv = gvQuestions.find(
              q => q.title.toLowerCase().trim() === opts.question.title.toLowerCase().trim()
            );
            if (matchedGv) {
              resolvedDay = matchedGv.dayNumber;
              basis = `Fallback lookup from GVChallengeCache metadata (result: Day ${resolvedDay})`;
            }
          }
          resolvedDay = resolvedDay || 1;
          const folder = `Day-${String(resolvedDay).padStart(2, '0')}`;
          console.log(`[Folder Selection] Selected folder: "${folder}" (Reason: ${basis})`);
          return folder;
        },
        getFilename: (title, ext) => {
          const sanitizedTitle = title.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
          return `${sanitizedTitle}.${ext}`;
        }
      },
      sheet: {
        getFolderName: async (opts) => {
          const folder = opts.sheet;
          console.log(`[Folder Selection] Selected folder: "${folder}" (Reason: Explicit sheet parameter from request)`);
          return folder;
        },
        getFilename: (title, ext) => {
          const sanitizedTitle = title.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
          return `${sanitizedTitle}.${ext}`;
        }
      },
      general: {
        getFolderName: async () => {
          console.log(`[Folder Selection] Selected folder: "general" (Reason: Default fallback for general context)`);
          return 'general';
        },
        getFilename: (title, ext) => {
          const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '');
          return `${cleanTitle}.${ext}`;
        }
      }
    };

    const ensureFolderExists = async (username, token, folderName, repo) => {
      const gitkeepPath = `${folderName}/.gitkeep`;
      console.log(`[Folder Initialization] Checking if folder "${folderName}" exists in repository "${repo}" via "${gitkeepPath}"...`);
      try {
        const exists = await githubRepositoryService.checkFileExists(username, token, gitkeepPath, repo);
        if (exists) {
          console.log(`[Folder Initialization] Folder "${folderName}" already exists in repository "${repo}".`);
          return true;
        }
      } catch (err) {
        console.error(`[Folder Initialization] Error checking folder existence for "${folderName}":`, err.message);
      }

      console.log(`[Folder Initialization] Folder "${folderName}" does not exist in repository "${repo}". Creating "${gitkeepPath}"...`);
      try {
        const base64Content = Buffer.from('').toString('base64');
        const commitMessage = `Initialize folder structure for ${folderName} (Auto-created)`;
        await githubRepositoryService.createFile(username, token, gitkeepPath, commitMessage, base64Content, repo);
        console.log(`[Folder Initialization] Successfully created folder "${folderName}" in repository "${repo}".`);
        return true;
      } catch (err) {
        console.error(`[Folder Initialization] Failed to automatically create folder "${folderName}" in repository "${repo}":`, err.message);
        return false;
      }
    };

    for (const target of targetRepos) {
      const repo = target.repo;
      const context = target.context;

      try {
        // 1. Ensure repository exists on GitHub
        console.log(`[GitHub Repo Service] Ensuring repository "${repo}" exists for user "${username}"...`);
        const ensuredRepo = await githubRepositoryService.ensureRepositoryExists(username, token, repo);
        if (!ensuredRepo.exists) {
          console.warn(`[GitHub Sync] Skip sync: Repository "${repo}" does not exist/cannot be created.`);
          continue;
        }

        // For companies preparation primary URL tracking
        if (
          repo === REPOS.company &&
          ensuredRepo.repositoryUrl &&
          user.githubRepositoryUrl !== ensuredRepo.repositoryUrl
        ) {
          user.githubRepositoryUrl = ensuredRepo.repositoryUrl;
          await user.save();
        }

        // 2. Resolve folder name using strategy
        const strategy = CONTEXT_STRATEGIES[context] || CONTEXT_STRATEGIES.general;
        const folderName = await strategy.getFolderName({
          company,
          challenge,
          day,
          pattern,
          sheet,
          question,
          questionId,
        });

        if (!folderName) {
          console.warn(`[GitHub Sync] Skip sync: Could not resolve folder name for context "${context}".`);
          continue;
        }

        // 3. Ensure folder exists (creates .gitkeep if missing)
        const folderReady = await ensureFolderExists(username, token, folderName, repo);
        if (!folderReady) {
          console.warn(`[GitHub Sync] Skip sync: Target folder "${folderName}" is not ready.`);
          continue;
        }

        // 4. Determine file path
        const ext = extensionMap[language.toLowerCase()] || language.toLowerCase();
        const filename = strategy.getFilename(questionTitle, ext);
        const filePath = `${folderName}/${filename}`;

        // 5. Check if we should skip push due to deduplication
        let isReadyToPush = true;
        if (alreadySolved) {
          try {
            const existingFile = await githubRepositoryService.getFileDetails(username, token, filePath, repo);
            if (existingFile) {
              console.log(`[GitHub Sync] Skipping push: "${filePath}" already exists in "${repo}" and question is marked solved.`);
              isReadyToPush = false;
            }
          } catch (err) {
            console.error(`[GitHub Sync] Error probing "${filePath}" in "${repo}":`, err.message);
          }
        }

        if (isReadyToPush) {
          // 6. Push code file
          let sha = null;
          try {
            const fileDetails = await githubRepositoryService.getFileDetails(username, token, filePath, repo);
            if (fileDetails) {
              sha = fileDetails.sha;
            }
          } catch (err) {
            console.error(`[GitHub Sync] Error fetching file details for "${filePath}":`, err.message);
          }

          const base64Content = Buffer.from(code).toString('base64');
          const commitMessage = sha
            ? `Update solution for ${questionTitle} (Auto-sync)`
            : `Add solution for ${questionTitle} (Auto-sync)`;

          console.log(`[GitHub Push] Pushing solution to path "${filePath}" in repository "${repo}" (isUpdate: ${!!sha})...`);
          await githubRepositoryService.createOrUpdateFile(username, token, filePath, commitMessage, base64Content, sha, repo);
          console.log(`[GitHub Push] Successfully pushed solution to path "${filePath}" in repository "${repo}".`);
          githubSynced = true;

          // 7. Update README.md
          try {
            console.log(`[README Gen] Compiling progress for repository "${repo}" and generating README.md content...`);
            const { getReadmeGenerator } = require('./readme');
            const generator = getReadmeGenerator(repo);
            const readmeData = await generator.getData(userId);
            const readmeContent = generator.generateReadme(readmeData, repo);
            console.log(`[README Gen] Successfully generated README.md content for repository "${repo}".`);

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
              console.error(`[GitHub Sync] Error fetching README details:`, err.message);
            }

            console.log(`[GitHub Push] Pushing updated README.md to repository "${repo}" (isUpdate: ${!!readmeSha})...`);
            await githubRepositoryService.createOrUpdateFile(username, token, readmePath, readmeCommitMsg, readmeBase64, readmeSha, repo);
            console.log(`[GitHub Push] Successfully pushed updated README.md to repository "${repo}".`);
          } catch (readmeErr) {
            console.error(`[README Gen] Failed to update README.md in "${repo}":`, readmeErr.message);
          }
        }
      } catch (repoErr) {
        console.error(`[GitHub Sync] Error processing target repo "${repo}":`, repoErr.message);
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
