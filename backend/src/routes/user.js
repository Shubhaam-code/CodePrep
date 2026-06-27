const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const CompanyQuestion = require('../models/CompanyQuestion');
const Question = require('../models/Question');

const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

/**
 * @route   POST /api/user/solve/:questionId
 */
router.post('/solve/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }

    const questionExists = await Question.exists({ _id: questionId });
    if (!questionExists) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const alreadySolvedIndex = user.solvedQuestions.findIndex(
      (q) => q.questionId.toString() === questionId
    );

    const now = new Date();

    if (alreadySolvedIndex > -1) {
      user.solvedQuestions[alreadySolvedIndex].solvedAt = now;
    } else {
      user.solvedQuestions.push({ questionId, solvedAt: now });
    }

    // Streak Logic
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



    // Return the updated solvedQuestions array directly
    res.status(200).json(user.solvedQuestions);
  } catch (error) {
    console.error('Error toggling solve:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/user/solve/:questionId
 */
router.delete('/solve/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.solvedQuestions = user.solvedQuestions.filter(
      (q) => q.questionId.toString() !== questionId
    );

    await user.save();

    // Return the updated solvedQuestions array directly
    res.status(200).json(user.solvedQuestions);
  } catch (error) {
    console.error('Error removing solve:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/user/bookmark/:questionId
 */
router.post('/bookmark/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.bookmarks.includes(questionId)) {
      user.bookmarks.push(questionId);
      await user.save();
    }

    // Return the updated bookmarks array directly
    res.status(200).json(user.bookmarks);
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/user/bookmark/:questionId
 */
router.delete('/bookmark/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.bookmarks = user.bookmarks.filter((id) => id.toString() !== questionId);
    await user.save();

    // Return the updated bookmarks array directly
    res.status(200).json(user.bookmarks);
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/user/dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'solvedQuestions.questionId',
        model: 'Question',
        select: 'title difficulty'
      })
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalSolved = user.solvedQuestions.length;
    const totalBookmarked = user.bookmarks.length;

    const recentSolved = [...user.solvedQuestions]
      .sort((a, b) => new Date(b.solvedAt) - new Date(a.solvedAt))
      .slice(0, 5)
      .map(sq => ({
        title: sq.questionId ? sq.questionId.title : `Question #${sq.questionId}`,
        difficulty: sq.questionId ? sq.questionId.difficulty : 'Easy',
        solvedAt: sq.solvedAt ? new Date(sq.solvedAt).toISOString() : new Date().toISOString()
      }));

    // Optimize: fetch only 'alltime' and select minimal fields, using lean()
    const allCompanyQuestions = await CompanyQuestion.find({ timeframe: 'alltime' })
      .select('company questionId')
      .lean();
    
    const companyTotals = {};
    const companySolved = {};
    
    const solvedQuestionSet = new Set(
      user.solvedQuestions.map(sq => 
        sq.questionId ? sq.questionId._id.toString() : sq.questionId.toString()
      )
    );

    allCompanyQuestions.forEach(cq => {
      if (cq.questionId) {
        const qIdStr = cq.questionId.toString();
        companyTotals[cq.company] = (companyTotals[cq.company] || 0) + 1;
        if (solvedQuestionSet.has(qIdStr)) {
          companySolved[cq.company] = (companySolved[cq.company] || 0) + 1;
        }
      }
    });

    const solvedByCompany = Object.keys(companyTotals).map(company => ({
      company,
      solved: companySolved[company] || 0,
      total: companyTotals[company]
    }));

    res.status(200).json({
      totalSolved,
      totalBookmarked,
      streak: user.streak,
      solvedByCompany,
      recentSolved
    });
  } catch (error) {
    console.error('Error compiling dashboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
