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
 *   - Pattern roadmap   → pattern-roadmap
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

  console.log("GitHub Connected:", user.githubConnected);
console.log("GitHub Username:", user.githubUsername);
console.log("Has Token:", !!user.githubAccessToken);

  // 4. Automatically invoke GitHub push if GitHub is connected
  if (user.githubConnected && user.githubAccessToken && user.githubUsername) {
    const token = user.githubAccessToken;
    const username = user.githubUsername;

    const questionTitle = question.title;

    // Resolve which dedicated repository this submission belongs to.
    const { repo } = resolveRepoForContext({
      company,
      challenge,
      pattern,
      sheet,
      syncContext,
    });

    try {
      // Verify the dedicated repository exists. For the GV Challenge we
      // auto-create the repository on first sync so that solving Day 1
      // works without requiring a manual /create-repository call. The
      // Company flow keeps its existing "create repo manually first"
      // contract — the auto-create only kicks in for the GV context.
      let repoExists = false;
      try {
        repoExists = await githubRepositoryService.checkRepositoryExists(username, token, repo);
      } catch (err) {
        console.error(`Error checking repository existence for ${repo}:`, err.message);
      }

      if (!repoExists && challenge === 'gv') {
        try {
          await githubRepositoryService.createRepository(token, repo);
          repoExists = true;
          console.log(`Auto-created GV Challenge repository "${repo}" for user: ${username}`);
        } catch (createRepoErr) {
          console.error(`Failed to auto-create GV Challenge repository "${repo}":`, createRepoErr.message);
        }
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

        if (challenge === 'gv') {
          // GV Challenge lives in its own repo under a dedicated DAY folder.
          // Ensure both the root folder (GVishwanathanChallenge/) and the
          // per-day subfolder (DAY<n>/) exist by creating .gitkeep placeholders
          // on first use. GitHub's Contents API does not create intermediate
          // directories automatically, so each parent in the path needs to
          // exist before we can push the solution file.
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
        } else if (pattern) {
          // Pattern roadmap: organise by pattern slug.
          const sanitizedTitle = questionTitle.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
          filePath = `${pattern}/${sanitizedTitle}.${ext}`;
          isReadyToPush = true;
        } else if (sheet) {
          // Sheet roadmap: organise by sheet slug.
          const sanitizedTitle = questionTitle.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
          filePath = `${sheet}/${sanitizedTitle}.${ext}`;
          isReadyToPush = true;
        } else {
          // Company flow (default + general): organise by company folder.
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
          // ── Backfill guard ─────────────────────────────────────────────
          // If this question is already recorded as solved in MongoDB for
          // this syncContext, the file may still be missing from GitHub
          // (e.g. the previous sync crashed mid-flight, the repo was
          // recreated, or the question was marked solved via the
          // "Already Solved Before" flow which intentionally skips
          // GitHub). Before skipping the push, probe GitHub for the
          // expected file path:
          //   • file exists  → skip (no duplicate commit, README unchanged)
          //   • file missing → fall through and push (backfill the file)
          // MongoDB state is unchanged either way: the surrounding code
          // already gates user.solvedQuestions / Submission writes on
          // !alreadySolved, so we never duplicate MongoDB records.
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
          // Get existing file SHA if any
          let sha = null;
          try {
            const fileDetails = await githubRepositoryService.getFileDetails(username, token, filePath, repo);
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

          await githubRepositoryService.createOrUpdateFile(username, token, filePath, commitMessage, base64Content, sha, repo);
          githubSynced = true;

          // 5. Update README.md after successful sync (scoped to this repo)
          try {
            console.log(`Compiling CodePrep progress and updating README.md in ${repo}...`);
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
            let readmeContent = `# ${repo} – CodePrep Progress\n\nTotal Solved: ${totalSolved}\n`;
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
