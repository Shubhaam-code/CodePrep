const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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

    // 3. Assign random correct answers A-D to each question in DB session
    const answers = ['A', 'B', 'C', 'D'];
    const examQuestions = selected.map(q => {
      const correct = answers[Math.floor(Math.random() * answers.length)];
      return {
        questionId: q._id,
        correctAnswer: correct,
        userAnswer: null,
        isCorrect: false
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

    // 6. Return response to client without exposing correct answers
    const clientQuestions = selected.map(q => ({
      _id: q._id,
      title: q.title,
      difficulty: q.difficulty,
      leetcodeUrl: q.leetcodeUrl,
      options: defaultOptions
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

    // Convert map to format if needed
    let submissions = {};
    if (Array.isArray(answers)) {
      answers.forEach(a => {
        submissions[a.questionId.toString()] = a.userAnswer;
      });
    } else if (typeof answers === 'object') {
      // Map format
      Object.keys(answers).forEach(qId => {
        submissions[qId] = answers[qId];
      });
    }

    // Grade each question
    let score = 0;
    session.questions.forEach(q => {
      const qIdStr = q.questionId.toString();
      const userAns = submissions[qIdStr] || null;
      q.userAnswer = userAns;
      q.isCorrect = userAns !== null && userAns === q.correctAnswer;
      if (q.isCorrect) {
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
          code: `Mock Exam Submission (Option ${q.userAnswer || 'None'})`,
          language: 'Multiple',
          status: q.isCorrect ? 'passed' : 'failed',
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
        title: detail ? detail.title : 'Unknown Question',
        difficulty: detail ? detail.difficulty : 'Easy',
        leetcodeUrl: detail ? detail.leetcodeUrl : null,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: q.isCorrect,
        options: defaultOptions
      };
    });

    // Compile difficulty breakdown stats
    const breakdown = {
      Easy: { solved: 0, total: 0 },
      Medium: { solved: 0, total: 0 },
      Hard: { solved: 0, total: 0 }
    };

    formattedQuestions.forEach(q => {
      const diff = q.difficulty; // 'Easy', 'Medium', 'Hard'
      if (breakdown[diff]) {
        breakdown[diff].total++;
        if (q.isCorrect) {
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

module.exports = router;
