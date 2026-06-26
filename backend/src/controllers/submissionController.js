const submissionService = require('../services/submissionService');
const User = require('../models/User');
const Submission = require('../models/Submission');

/**
 * Handle question solving submission and auto-syncing with GitHub.
 * POST /api/submissions/solve
 */
exports.solveQuestion = async (req, res) => {
  try {
    const { questionId, code, language, company, challenge, day, pattern, sheet, syncContext } = req.body;

    if (!questionId) {
      return res.status(400).json({ success: false, message: 'Bad Request: questionId is required.' });
    }
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, message: 'Bad Request: code is required.' });
    }
    if (!language || typeof language !== 'string') {
      return res.status(400).json({ success: false, message: 'Bad Request: language is required.' });
    }

    // Sanitize optional context fields so submissions are routed to the
    // correct dedicated GitHub repository.
    const sanitizedCompany      = (company   && typeof company   === 'string') ? company.trim().toLowerCase() : null;
    const sanitizedChallenge    = (challenge && typeof challenge === 'string') ? challenge.trim()             : null;
    const sanitizedDay          = (day !== undefined && day !== null && !isNaN(Number(day))) ? Number(day)    : null;
    const sanitizedPattern      = (pattern   && typeof pattern   === 'string') ? pattern.trim()               : null;
    const sanitizedSheet        = (sheet     && typeof sheet     === 'string') ? sheet.trim()                 : null;
    const sanitizedSyncContext  = (syncContext && typeof syncContext === 'string') ? syncContext.trim()        : null;

    const userId = req.user.id;

    const result = await submissionService.saveSubmissionAndPush(
      userId,
      questionId,
      code,
      language,
      sanitizedCompany,
      sanitizedChallenge,
      sanitizedDay,
      sanitizedSyncContext,
      sanitizedPattern,
      sanitizedSheet
    );

    return res.status(200).json({
      success: true,
      submissionSaved: result.submissionSaved,
      githubSynced: result.githubSynced,
    });
  } catch (error) {
    console.error('Solve question submission error:', error);
    
    if (error.message === 'Question not found') {
      return res.status(404).json({ success: false, message: error.message });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

/**
 * GET /api/submissions/history/company
 *
 * Returns the user's Company submission history, newest first.
 *
 * Source of truth: User.solvedQuestions[].syncContext. Per the spec we
 * keep ONLY entries whose syncContext starts with "company_" and
 * exclude everything that starts with "gv_", "pattern_", "roadmap_",
 * or equals "general". The "company" value in the response is the
 * syncContext suffix (e.g. "company_google" → "google").
 *
 * Language + githubSynced are derived from the latest matching
 * Submission document for the same (userId, questionId). githubUrl is
 * only constructed when the user has linked a GitHub account; otherwise
 * it is null.
 *
 * Optimised for the History page (replaces the old GV-based feed):
 *   • 1 User.findById with solvedQuestions.questionId populated.
 *   • 1 Submission.find with $in on questionId, sorted desc.
 *   • multikey index on solvedQuestions.syncContext (User schema) keeps
 *     the filter cheap as the array grows.
 */
exports.getCompanyHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Load user + populated solvedQuestions in one round-trip.
    const user = await User.findById(userId).populate({
      path: 'solvedQuestions.questionId',
      model: 'Question',
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // 2. Filter solvedQuestions to company_* only — explicitly excluding
    //    every other learning surface the spec calls out.
    const companyEntries = (user.solvedQuestions || []).filter((sq) => {
      const ctx = (sq.syncContext || 'general').toString();
      if (!ctx.startsWith('company_')) return false;
      if (ctx.startsWith('gv_'))        return false;
      if (ctx.startsWith('pattern_'))   return false;
      if (ctx.startsWith('roadmap_'))   return false;
      return ctx !== 'general';
    });

    if (companyEntries.length === 0) {
      return res.status(200).json({ submissions: [] });
    }

    // 3. Single Submission.find to grab the latest submission per
    //    questionId. Avoids N+1; relies on the existing userId index.
    const questionIds = [
      ...new Set(
        companyEntries
          .map((sq) => (sq.questionId && sq.questionId._id ? sq.questionId._id.toString() : null))
          .filter(Boolean)
      ),
    ];

    const submissions = await Submission.find({
      userId,
      questionId: { $in: questionIds },
    })
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean();

    // Build a map of questionIdString → most-recent submission.
    const latestByQuestionId = new Map();
    for (const sub of submissions) {
      const key = sub.questionId.toString();
      if (!latestByQuestionId.has(key)) {
        latestByQuestionId.set(key, sub);
      }
    }

    // 4. Build the response rows. Sort newest first per spec.
    const rows = companyEntries
      .map((sq) => {
        const question = sq.questionId; // populated Question or null
        if (!question) return null; // question deleted — skip silently

        const ctx = (sq.syncContext || '').toString();
        const company = ctx.slice('company_'.length);
        const questionIdStr = question._id.toString();
        const latestSub = latestByQuestionId.get(questionIdStr);

        const language = latestSub ? latestSub.language : '';
        const githubSynced = !!latestSub;

        const solvedAt = sq.solvedAt
          ? new Date(sq.solvedAt).toISOString()
          : new Date().toISOString();

        // githubUrl: only when the user has linked GitHub AND we have
        // a submission to point at. Mirrors the file-path scheme used
        // by submissionService.saveSubmissionAndPush for the company
        // flow (Company/<CleanTitle>.<ext> on the main branch).
        let githubUrl = null;
        if (user.githubUsername && githubSynced) {
          const folderCompany = company.charAt(0).toUpperCase() + company.slice(1).toLowerCase();
          const cleanTitle = question.title.replace(/[^a-zA-Z0-9]/g, '');
          const ext = extensionFor(language);
          const filePath = `${folderCompany}/${cleanTitle}.${ext}`;
          githubUrl =
            `https://github.com/${encodeURIComponent(user.githubUsername)}` +
            `/company-preparation/blob/main/${filePath
              .split('/')
              .map((s) => encodeURIComponent(s))
              .join('/')}`;
        }

        return {
          questionTitle: question.title,
          company,
          difficulty: question.difficulty,
          language,
          solvedAt,
          githubSynced,
          githubUrl,
          leetcodeUrl: question.leetcodeUrl || null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.solvedAt) - new Date(a.solvedAt));

    return res.status(200).json({ submissions: rows });
  } catch (error) {
    console.error('Company history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

/**
 * Map a Submission.language string to a file extension. Mirrors the
 * extensionMap in submissionService.saveSubmissionAndPush so the
 * constructed githubUrl points at the same path that was actually
 * pushed. Unknown languages fall back to the lowercased input, which
 * is what the sync flow also does.
 */
function extensionFor(language) {
  if (!language) return '';
  const map = {
    'cpp': 'cpp', 'c++': 'cpp',
    'java': 'java',
    'python': 'py', 'python3': 'py',
    'javascript': 'js', 'js': 'js',
    'typescript': 'ts', 'ts': 'ts',
    'c': 'c',
    'csharp': 'cs', 'c#': 'cs',
    'go': 'go',
    'rust': 'rs',
    'ruby': 'rb',
    'swift': 'swift',
    'kotlin': 'kt',
    'scala': 'scala',
    'php': 'php',
    'html': 'html',
    'css': 'css',
    'sql': 'sql',
  };
  const key = language.toLowerCase();
  return map[key] || key;
}
