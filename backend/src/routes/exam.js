const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const authMiddleware = require('../middleware/auth');
const ExamSession = require('../models/ExamSession');
const CompanyQuestion = require('../models/CompanyQuestion');
const Question = require('../models/Question');
const Submission = require('../models/Submission');

router.use(authMiddleware);

// Standard options list
const defaultOptions = [
  { key: 'A', text: 'Brute force approach with nested loops. Time complexity: O(N²).' },
  { key: 'B', text: 'Optimal sorting-based binary search. Time complexity: O(N log N).' },
  { key: 'C', text: 'Linear scan utilizing a HashMap or HashSet. Time complexity: O(N).' },
  { key: 'D', text: 'Space-optimized solution. Auxiliary space complexity: O(1).' }
];

/**
 * @route   POST /api/exam/start
 * @desc    Start a timed mock exam session
 */
router.post('/start', async (req, res) => {
  try {
    const { company, difficulty, count } = req.body;

    if (!company || !difficulty || !count) {
      return res.status(400).json({ message: 'Company, difficulty, and count are required' });
    }

    const companyName = company.toLowerCase().trim();
    const countNum = parseInt(count);

    // 1. Fetch matching company questions populated with Question details
    const allCompanyQuestions = await CompanyQuestion.find({ company: companyName })
      .populate({
        path: 'questionId',
        model: 'Question'
      });

    // Filter by difficulty (Mixed means any difficulty)
    const validQuestions = allCompanyQuestions
      .filter(cq => cq.questionId !== null)
      .map(cq => cq.questionId)
      .filter(q => {
        if (difficulty === 'Mixed') return true;
        return q.difficulty.toLowerCase() === difficulty.toLowerCase();
      });

    if (validQuestions.length === 0) {
      return res.status(404).json({ message: `No questions found for ${company} with difficulty ${difficulty}` });
    }

    // 2. Select 'count' random unique questions (or as many as available)
    const shuffled = [...validQuestions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(countNum, shuffled.length));

    // 3. Initialize question details for code submission
    const examQuestions = selected.map(q => {
      return {
        questionId: q._id,
        userCode: '',
        language: '',
        attempted: false
      };
    });

    // 4. Time limits
    let timeLimit = 90; // Default
    if (difficulty === 'Easy') timeLimit = 60;
    else if (difficulty === 'Medium') timeLimit = 90;
    else if (difficulty === 'Hard') timeLimit = 120;

    // 5. Create ExamSession record
    const session = new ExamSession({
      userId: req.user.id,
      company: companyName,
      questions: examQuestions,
      startTime: new Date(),
      status: 'active',
      timeLimit,
      difficulty
    });

    await session.save();

    // 6. Return response to client with leetcodeId
    const clientQuestions = selected.map(q => ({
      _id: q._id,
      leetcodeId: q.leetcodeId,
      title: q.title,
      difficulty: q.difficulty,
      leetcodeUrl: q.leetcodeUrl
    }));

    res.status(201).json({
      examId: session._id,
      questions: clientQuestions,
      timeLimit
    });
  } catch (error) {
    console.error('Error starting exam:', error);
    res.status(500).json({ message: 'Server error starting exam session' });
  }
});

/**
 * @route   POST /api/exam/submit/:examId
 * @desc    Submit answers for an exam session
 */
router.post('/submit/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    const { answers } = req.body; // Map format: { questionId: answerKey } or array: [{ questionId, userAnswer }]

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ message: 'Invalid exam ID' });
    }

    const session = await ExamSession.findById(examId);
    if (!session) {
      return res.status(404).json({ message: 'Exam session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ message: 'Exam session is already completed or abandoned' });
    }

    // Convert map or array to standard submissions map
    let submissions = {};
    if (Array.isArray(answers)) {
      answers.forEach(a => {
        submissions[a.questionId.toString()] = {
          userCode: a.userCode || '',
          language: a.language || '',
          attempted: !!a.attempted
        };
      });
    } else if (typeof answers === 'object' && answers !== null) {
      Object.keys(answers).forEach(qId => {
        const item = answers[qId];
        submissions[qId] = {
          userCode: typeof item === 'object' ? item.userCode : '',
          language: typeof item === 'object' ? item.language : '',
          attempted: typeof item === 'object' ? !!item.attempted : false
        };
      });
    }

    // Grade each question based on attempted status
    let score = 0;
    session.questions.forEach(q => {
      const qIdStr = q.questionId.toString();
      const sub = submissions[qIdStr] || { userCode: '', language: '', attempted: false };
      q.userCode = sub.userCode;
      q.language = sub.language;
      q.attempted = sub.attempted;
      if (q.attempted) {
        score++;
      }
    });

    session.score = score;
    session.endTime = new Date();
    session.status = 'completed';

    await session.save();

    // Fetch user current streak
    let currentStreak = 0;
    try {
      const User = require('../models/User');
      const user = await User.findById(session.userId);
      if (user) {
        currentStreak = user.streak.current;
      }
    } catch (err) {
      console.error('Error fetching user for streak:', err);
    }

    // Log individual question attempts to history table
    for (const q of session.questions) {
      try {
        const sub = new Submission({
          userId: session.userId,
          questionId: q.questionId,
          code: q.userCode || 'Skipped',
          language: q.language || 'Plain Text',
          status: q.attempted ? 'passed' : 'failed',
          type: 'mock',
          streakDay: currentStreak
        });
        await sub.save();
      } catch (err) {
        console.error('Error logging exam submission to history:', err);
      }
    }

    res.status(200).json({
      message: 'Exam submitted successfully',
      examId: session._id,
      score,
      total: session.questions.length
    });
  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({ message: 'Server error submitting exam' });
  }
});

// Fallback for body param mapping of submit (handling both formats)
router.post('/submit', async (req, res) => {
  const { examId, answers } = req.body;
  if (!examId) {
    return res.status(400).json({ message: 'examId is required' });
  }
  req.params.examId = examId;
  return router.handle(req, res); // Redirect to parameterized submit
});

/**
 * @route   GET /api/exam/result/:examId
 * @desc    Fetch results of an exam session
 */
router.get('/result/:examId', async (req, res) => {
  try {
    const { examId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ message: 'Invalid exam ID' });
    }

    const session = await ExamSession.findById(examId)
      .populate({
        path: 'questions.questionId',
        model: 'Question'
      });

    if (!session) {
      return res.status(404).json({ message: 'Exam session not found' });
    }

    // Compute duration in seconds
    const start = new Date(session.startTime);
    const end = session.endTime ? new Date(session.endTime) : new Date();
    const timeTaken = Math.round((end - start) / 1000); // duration in seconds

    // Compile questions breakdown with title/diff/leetcode details
    const formattedQuestions = session.questions.map(q => {
      const detail = q.questionId;
      return {
        questionId: detail ? detail._id : q.questionId,
        leetcodeId: detail ? detail.leetcodeId : null,
        title: detail ? detail.title : 'Unknown Question',
        difficulty: detail ? detail.difficulty : 'Easy',
        leetcodeUrl: detail ? detail.leetcodeUrl : null,
        userCode: q.userCode || '',
        language: q.language || '',
        attempted: !!q.attempted
      };
    });

    // Compile difficulty breakdown stats based on attempted status
    const breakdown = {
      Easy: { solved: 0, total: 0 },
      Medium: { solved: 0, total: 0 },
      Hard: { solved: 0, total: 0 }
    };

    formattedQuestions.forEach(q => {
      const diff = q.difficulty; // 'Easy', 'Medium', 'Hard'
      if (breakdown[diff]) {
        breakdown[diff].total++;
        if (q.attempted) {
          breakdown[diff].solved++;
        }
      }
    });

    res.status(200).json({
      examId: session._id,
      score: session.score,
      totalQuestions: session.questions.length,
      company: session.company,
      difficulty: session.difficulty,
      timeLimit: session.timeLimit,
      timeTaken, // in seconds
      status: session.status,
      questions: formattedQuestions,
      breakdown
    });
  } catch (error) {
    console.error('Error fetching exam result:', error);
    res.status(500).json({ message: 'Server error retrieving exam result' });
  }
});

/**
 * @route   DELETE /api/exam/history/all
 * @desc    Delete all mock exam history
 */
router.delete('/history/all', async (req, res) => {
  try {
    await ExamSession.deleteMany({ userId: req.user.id });
    res.status(200).json({ message: 'All exam history deleted successfully.' });
  } catch (error) {
    console.error('Error deleting all exam history:', error);
    res.status(500).json({ message: 'Server error deleting exam history' });
  }
});

/**
 * @route   POST /api/exam/history/delete-multiple
 * @desc    Delete multiple mock exam sessions
 */
router.post('/history/delete-multiple', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ message: 'Invalid list of IDs' });
  }
  try {
    await ExamSession.deleteMany({
      _id: { $in: ids },
      userId: req.user.id
    });
    res.status(200).json({ message: 'Selected exam history deleted successfully.' });
  } catch (error) {
    console.error('Error deleting selected exam history:', error);
    res.status(500).json({ message: 'Server error deleting exam history' });
  }
});

/**
 * @route   DELETE /api/exam/history/:id
 * @desc    Delete single mock exam session
 */
router.delete('/history/:id', async (req, res) => {
  try {
    const session = await ExamSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!session) {
      return res.status(404).json({ message: 'Session not found or unauthorized' });
    }
    res.status(200).json({ message: 'Exam session deleted successfully.' });
  } catch (error) {
    console.error('Error deleting single exam history:', error);
    res.status(500).json({ message: 'Server error deleting exam history' });
  }
});

/**
 * @route   GET /api/exam/question/:leetcodeId
 * @desc    Get detailed question content from Alpha API or local cache
 */
router.get('/question/:leetcodeId', async (req, res) => {
  try {
    const leetcodeId = parseInt(req.params.leetcodeId, 10);
    if (isNaN(leetcodeId)) {
      return res.status(400).json({ message: 'Invalid LeetCode ID' });
    }

    const question = await Question.findOne({ leetcodeId });
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const titleSlug = question.title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    const isCacheValid = question.contentFetchedAt && (new Date() - question.contentFetchedAt < CACHE_TTL);

    let content = question.fullContent || '';
    let exampleTestcases = question.exampleTestcases || '';
    let hints = question.hints || [];

    if (!isCacheValid) {
      try {
        const response = await fetch(`https://alfa-leetcode-api.onrender.com/select?titleSlug=${titleSlug}`, {
          headers: { 'User-Agent': 'node-fetch' }
        });
        if (response.ok) {
          const apiData = await response.json();
          if (apiData && !apiData.errors) {
            content = apiData.content || '';
            exampleTestcases = apiData.exampleTestcases || '';
            hints = apiData.hints || [];

            // Update cached fields in Question model
            question.fullContent = content;
            question.exampleTestcases = exampleTestcases;
            question.hints = hints;
            question.contentFetchedAt = new Date();
            await question.save();
          }
        }
      } catch (err) {
        console.error('Failed to fetch from Alfa LeetCode API, using cache:', err.message);
      }
    }

    // Fallback description if everything fails and we have no content
    if (!content) {
      content = `<p>No description available. Please practice this question directly on <a href="${question.leetcodeUrl || '#'}" target="_blank" class="text-[#FF7A00] underline">LeetCode</a>.</p>`;
    }

    res.status(200).json({
      title: question.title,
      difficulty: question.difficulty,
      content,
      exampleTestcases,
      hints,
      isPremium: question.isPremium || false,
      leetcodeUrl: question.leetcodeUrl || ''
    });
  } catch (error) {
    console.error('Error in exam question API:', error);
    res.status(500).json({ message: 'Server error retrieving exam question' });
  }
});

module.exports = router;
