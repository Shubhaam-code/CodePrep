const express = require('express');
const router = express.Router();
const RoadmapPattern = require('../models/RoadmapPattern');
const Question = require('../models/Question');
const roadmapController = require('../controllers/roadmapController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

/**
 * @route   GET /api/roadmap
 * @desc    Phase 5.1 — flat list of roadmap patterns in source order.
 *          One entry per pattern in roadmap.json with patternId,
 *          patternName, roadmapCategory, totalQuestions,
 *          solvedQuestions (always 0 for now), and roadmapOrder.
 *          No unlock / streak / history logic yet.
 */
router.get('/', roadmapController.listRoadmap);

/**
 * @route   GET /api/roadmap/patterns
 * @desc    List every RoadmapPattern, ordered by `order` ascending.
 *          Each row is enriched with `questionCount` (count of
 *          Questions in the Question collection whose
 *          roadmapCategory+roadmapPattern match). One round-trip per
 *          collection — no N+1.
 */
router.get('/patterns', async (req, res) => {
  try {
    const patterns = await RoadmapPattern.find()
      .sort({ order: 1, category: 1, pattern: 1 })
      .lean();

    if (patterns.length === 0) {
      return res.json({ patterns: [] });
    }

    // Aggregate question counts keyed by (category, pattern). Faster
    // than running one Question.countDocuments per pattern.
    const counts = await Question.aggregate([
      {
        $match: {
          roadmapCategory: { $ne: null },
          roadmapPattern:  { $ne: null },
        },
      },
      {
        $group: {
          _id: { category: '$roadmapCategory', pattern: '$roadmapPattern' },
          count: { $sum: 1 },
        },
      },
    ]);

    const countByKey = new Map();
    for (const row of counts) {
      const key = `${row._id.category}::${row._id.pattern}`;
      countByKey.set(key, row.count);
    }

    const enriched = patterns.map((p) => ({
      _id: p._id,
      category: p.category,
      pattern: p.pattern,
      order: p.order,
      estimatedTime: p.estimatedTime,
      description: p.description || '',
      isLockedByDefault: p.isLockedByDefault,
      questionCount:
        countByKey.get(`${p.category}::${p.pattern}`) || 0,
    }));

    return res.json({ patterns: enriched });
  } catch (err) {
    console.error('roadmap /patterns error:', err);
    return res.status(500).json({ message: 'Server error fetching roadmap patterns.' });
  }
});

/**
 * @route   GET /api/roadmap/patterns/:category/:pattern/questions
 * @desc    List Questions belonging to a single roadmap pattern,
 *          ordered by roadmapOrder. Backed by the existing
 *          Question collection — no second collection.
 */
router.get('/patterns/:category/:pattern/questions', async (req, res) => {
  try {
    const category = String(req.params.category || '').trim().toLowerCase();
    const pattern  = String(req.params.pattern  || '').trim().toLowerCase();

    if (!category || !pattern) {
      return res.status(400).json({
        message: 'category and pattern are required.',
      });
    }

    const questions = await Question.find({
      roadmapCategory: category,
      roadmapPattern: pattern,
    })
      .select(
        'leetcodeId title difficulty acceptance leetcodeUrl isPremium ' +
        'roadmapCategory roadmapPattern roadmapOrder patternOrder'
      )
      .sort({ roadmapOrder: 1, leetcodeId: 1 })
      .lean();

    return res.json({ questions });
  } catch (err) {
    console.error('roadmap /patterns/:category/:pattern/questions error:', err);
    return res.status(500).json({
      message: 'Server error fetching roadmap pattern questions.',
    });
  }
});

/**
 * @route   GET /api/roadmap/:patternId
 * @desc    Phase 5.2 — single-pattern detail. Returns the pattern
 *          metadata + every Question tagged with this patternId,
 *          sorted by roadmapOrder ascending. Each question is
 *          stamped with solved:false (Phase 5.2 placeholder; unlock
 *          / streak / history are out of scope here).
 *
 *          Registered AFTER /patterns so the existing
 *          /api/roadmap/patterns route still wins for that exact
 *          path (Express matches routes in declaration order).
 *
 *   Response: 200 with { patternId, patternName, roadmapCategory,
 *                         totalQuestions, questions[] }
 *   Response: 404 when patternId is not in roadmap.json
 */
router.get('/:patternId', roadmapController.getPattern);

module.exports = router;