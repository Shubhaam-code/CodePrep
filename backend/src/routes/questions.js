const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

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
 * @route   GET /api/questions/:id
 * @desc    Get question by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.status(200).json(question);
  } catch (error) {
    console.error('Error fetching question by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
