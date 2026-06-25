const submissionService = require('../services/submissionService');

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

    // Sanitize optional company field
    const sanitizedCompany = (company && typeof company === 'string')
      ? company.trim().toLowerCase()
      : null;

    const sanitizedChallenge = (challenge && typeof challenge === 'string') ? challenge.trim() : null;
    const sanitizedDay       = (day !== undefined && day !== null && !isNaN(Number(day))) ? Number(day) : null;
    const sanitizedSyncContext = (syncContext && typeof syncContext === 'string') ? syncContext.trim() : null;

    const userId = req.user.id;

    const result = await submissionService.saveSubmissionAndPush(
      userId,
      questionId,
      code,
      language,
      sanitizedCompany,
      sanitizedChallenge,
      sanitizedDay,
      sanitizedSyncContext
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
