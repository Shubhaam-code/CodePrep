const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/pattern', authMiddleware, 
  async (req, res) => {
    try {
      const { keywords } = req.query
      if (!keywords) return res.json([])
      
      const keywordList = keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)
      
      if (keywordList.length === 0) 
        return res.json([])
      
      const orConditions = keywordList.map(k => ({
        title: { $regex: k, $options: 'i' }
      }))
      
      const questions = await Question.find({
        $or: orConditions
      })
      .select(
        'leetcodeId title difficulty acceptance leetcodeUrl isPremium'
      )
      .sort({ difficulty: 1 })
      .limit(50)
      
      res.json(questions)
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error' })
    }
  }
);

const getKeywords = (topicName) => {
  const t = topicName.toLowerCase().trim();
  if (t === 'two sum' || t.includes('two sum') || t === 'subarray sums') {
    return ['sum'];
  }
  if (t === 'sliding window' || t.includes('sliding window')) {
    return ['window', 'substring'];
  }
  if (t === 'trees' || t.includes('tree') || t.includes('bst')) {
    return ['tree', 'binary'];
  }
  if (t === 'graphs' || t.includes('graph') || t.includes('bfs') || t.includes('dfs')) {
    return ['graph', 'island', 'path'];
  }
  if (t === 'dynamic programming' || t.includes('dynamic programming') || t.includes('dp')) {
    return ['dp', 'maximum', 'minimum'];
  }
  if (t === 'linked list' || t.includes('linked list') || t.includes('list') || t === 'reverse list' || t === 'detect cycle') {
    return ['linked', 'list', 'node'];
  }
  return [t];
};

/**
 * @route   GET /api/questions/topic/:topicName
 * @desc    Search questions where title matches mapped keywords, sorted by difficulty
 */
router.get('/topic/:topicName', async (req, res) => {
  try {
    const { topicName } = req.params;
    const keywords = getKeywords(topicName);

    const orConditions = keywords.map(kw => ({
      title: { $regex: kw, $options: 'i' }
    }));

    const questions = await Question.find({ $or: orConditions });

    // Sort by difficulty (Easy -> Medium -> Hard)
    const diffOrder = { Easy: 1, Medium: 2, Hard: 3 };
    questions.sort((a, b) => {
      const orderA = diffOrder[a.difficulty] || 4;
      const orderB = diffOrder[b.difficulty] || 4;
      return orderA - orderB;
    });

    res.status(200).json(questions);
  } catch (error) {
    console.error('Error fetching questions by topic:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/questions/:leetcodeId/links
 * @desc    Find question by leetcodeId and auto-generate alternative links from title
 */
router.get('/:leetcodeId/links', async (req, res) => {
  try {
    const leetcodeId = parseInt(req.params.leetcodeId, 10);
    if (isNaN(leetcodeId)) {
      return res.status(400).json({ message: 'Invalid LeetCode ID' });
    }

    const question = await Question.findOne({ leetcodeId });
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const slug = question.title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');



    res.status(200).json({
      isPremium: question.isPremium || false,
      leetcodeUrl: question.leetcodeUrl || '',

    });
  } catch (error) {
    console.error('Error fetching alternative links:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
