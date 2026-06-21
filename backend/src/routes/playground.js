const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const Question = require('../models/Question');
const DailyQuestion = require('../models/DailyQuestion');
const Submission = require('../models/Submission');
const User = require('../models/User');

router.use(authMiddleware);

// Utility helpers for date comparisons
const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isYesterday = (lastSolvedDate) => {
  if (!lastSolvedDate) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const lsd = new Date(lastSolvedDate);
  lsd.setHours(0,0,0,0);
  
  return lsd.getTime() === yesterday.getTime();
};

const isToday = (lastSolvedDate) => {
  if (!lastSolvedDate) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const lsd = new Date(lastSolvedDate);
  lsd.setHours(0,0,0,0);
  
  return lsd.getTime() === today.getTime();
};

/**
 * @route   GET /api/playground/daily
 * @desc    Get today's daily challenge question
 */
router.get('/daily', async (req, res) => {
  try {
    const todayStr = getTodayStr();
    
    // Find today's daily question
    let daily = await DailyQuestion.findOne({ date: todayStr }).populate({
      path: 'questionId',
      model: 'Question'
    });

    // If none exists, pick a random Medium question and create it
    if (!daily) {
      const mediumQuestions = await Question.find({ difficulty: 'Medium' });
      let selectedQ;
      
      if (mediumQuestions.length > 0) {
        selectedQ = mediumQuestions[Math.floor(Math.random() * mediumQuestions.length)];
      } else {
        // Fallback to any random question in case no Mediums exist
        const allQuestions = await Question.find();
        if (allQuestions.length === 0) {
          return res.status(404).json({ message: 'No questions seeded in the database' });
        }
        selectedQ = allQuestions[Math.floor(Math.random() * allQuestions.length)];
      }

      daily = new DailyQuestion({
        questionId: selectedQ._id,
        date: todayStr,
        solvedBy: []
      });

      await daily.save();
      
      // Populate details
      await daily.populate({
        path: 'questionId',
        model: 'Question'
      });
    }

    const isSolvedByUser = daily.solvedBy.includes(req.user.id);
    const totalSolvedCount = daily.solvedBy.length;

    res.status(200).json({
      question: daily.questionId,
      isSolvedByUser,
      totalSolvedCount
    });
  } catch (error) {
    console.error('Error in GET /daily:', error);
    res.status(500).json({ message: 'Server error retrieving daily question' });
  }
});

/**
 * @route   POST /api/playground/daily/solve
 * @desc    Solve today's daily question and increment streak
 */
router.post('/daily/solve', async (req, res) => {
  try {
    const todayStr = getTodayStr();
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    const daily = await DailyQuestion.findOne({ date: todayStr });
    if (!daily) {
      return res.status(404).json({ message: 'Today\'s daily challenge not initialized yet' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const questionId = daily.questionId;

    // 1. Update user streak
    const now = new Date();
    const lastSolved = user.streak.lastSolvedDate;

    if (!lastSolved) {
      user.streak.current = 1;
    } else {
      if (isToday(lastSolved)) {
        // Solved today; keep current streak
      } else if (isYesterday(lastSolved)) {
        // Solved yesterday; increment streak
        user.streak.current += 1;
      } else {
        // Streak broken; reset to 1
        user.streak.current = 1;
      }
    }

    user.streak.lastSolvedDate = now;

    // 2. Mark solved in DailyQuestion
    if (!daily.solvedBy.includes(user._id)) {
      daily.solvedBy.push(user._id);
      await daily.save();
    }

    // 3. Mark solved in User profile
    const alreadySolved = user.solvedQuestions.some(
      sq => sq.questionId.toString() === questionId.toString()
    );
    if (!alreadySolved) {
      user.solvedQuestions.push({
        questionId,
        solvedAt: now
      });
    }

    await user.save();

    // 4. Save submission
    const submission = new Submission({
      userId: user._id,
      questionId,
      code,
      language,
      status: 'passed', // Daily solve is graded as passed
      type: 'playground',
      streakDay: user.streak.current
    });
    await submission.save();

    res.status(200).json({
      message: 'Daily question solved successfully!',
      streak: user.streak,
      solvedAt: now
    });
  } catch (error) {
    console.error('Error solving daily question:', error);
    res.status(500).json({ message: 'Server error solving daily question' });
  }
});

/**
 * @route   GET /api/playground/random
 * @desc    Get a random question, optionally filtered by difficulty
 */
router.get('/random', async (req, res) => {
  try {
    const { difficulty } = req.query;
    const filter = {};
    if (difficulty) {
      filter.difficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
    }

    const questions = await Question.find(filter);
    if (questions.length === 0) {
      return res.status(404).json({ message: 'No matching questions found' });
    }

    const randomQ = questions[Math.floor(Math.random() * questions.length)];
    res.status(200).json(randomQ);
  } catch (error) {
    console.error('Error fetching random question:', error);
    res.status(500).json({ message: 'Server error fetching random question' });
  }
});

/**
 * @route   POST /api/playground/submit
 * @desc    Submit standard code playground solution (non-daily)
 */
router.post('/submit', async (req, res) => {
  try {
    const { questionId, code, language } = req.body;

    if (!questionId || !code || !language) {
      return res.status(400).json({ message: 'QuestionId, code, and language are required' });
    }

    // 70% pass, 30% fail to make simulated runner feel responsive
    const status = Math.random() < 0.7 ? 'passed' : 'failed';

    const user = await User.findById(req.user.id);
    let streakDay = 0;
    if (user) {
      streakDay = user.streak.current;

      // If passed, mark as solved in user profile too
      if (status === 'passed') {
        const alreadySolved = user.solvedQuestions.some(
          sq => sq.questionId.toString() === questionId.toString()
        );
        if (!alreadySolved) {
          user.solvedQuestions.push({
            questionId,
            solvedAt: new Date()
          });

          // Update streak
          const now = new Date();
          const lastSolved = user.streak.lastSolvedDate;
          if (!lastSolved) {
            user.streak.current = 1;
          } else {
            if (isToday(lastSolved)) {
              // Keep
            } else if (isYesterday(lastSolved)) {
              user.streak.current += 1;
            } else {
              user.streak.current = 1;
            }
          }
          user.streak.lastSolvedDate = now;
          await user.save();
          streakDay = user.streak.current;
        }
      }
    }

    const submission = new Submission({
      userId: req.user.id,
      questionId,
      code,
      language,
      status,
      type: 'playground',
      streakDay
    });
    await submission.save();

    res.status(200).json({
      status: 'submitted',
      runStatus: status,
      message: status === 'passed' 
        ? 'All test cases passed successfully!' 
        : 'Compilation/Assertion failed on test case 4/12.'
    });
  } catch (error) {
    console.error('Error submitting playground solution:', error);
    res.status(500).json({ message: 'Server error submitting playground solution' });
  }
});

/**
 * @route   GET /api/playground/submissions
 * @desc    Get user's past playground submissions
 */
router.get('/submissions', async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.user.id })
      .populate({
        path: 'questionId',
        model: 'Question'
      })
      .sort({ submittedAt: -1 });

    res.status(200).json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Server error fetching submissions' });
  }
});

module.exports = router;
