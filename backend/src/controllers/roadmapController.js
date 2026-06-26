const roadmapService = require('../services/roadmapService');

/**
 * GET /api/roadmap
 *
 * Returns the full roadmap list — one entry per pattern in
 * roadmap.json, in source order. Each entry carries the pattern
 * metadata (id, name, category, order) and live counts from the
 * Question collection (totalQuestions, solvedQuestions) driven by
 * the authenticated user's Submission history. progress is the
 * round(solved/total*100) — 0 when totalQuestions is 0.
 *
 *   Response: 200 with [
 *     { patternId, patternName, roadmapCategory, roadmapOrder,
 *       totalQuestions, solvedQuestions, progress }, ...
 *   ]
 */
exports.listRoadmap = async (req, res) => {
  try {
    const patterns = await roadmapService.listRoadmapPatterns(
      req.user && req.user.id ? req.user.id : null
    );
    return res.json(patterns);
  } catch (err) {
    console.error('roadmap list error:', err.message);
    return res.status(500).json({ message: 'Server error fetching roadmap list.' });
  }
};

/**
 * GET /api/roadmap/:patternId
 *
 * Phase 5.2/5.3 — single-pattern detail. Returns the pattern's
 * metadata + every Question tagged with that patternId, sorted
 * by roadmapOrder ascending. Each question carries a `solved`
 * flag driven by the authenticated user's Submission history
 * (Phase 5.3). Unlock / streak / history / progress remain out
 * of scope here.
 *
 *   Response: 200 with { patternId, patternName, roadmapCategory,
 *                         totalQuestions, questions[] }
 *   Response: 404 when patternId is not present in roadmap.json
 */
exports.getPattern = async (req, res) => {
  try {
    const data = await roadmapService.getPatternById(
      req.params.patternId,
      req.user && req.user.id ? req.user.id : null
    );
    if (!data) {
      return res.status(404).json({ message: 'Pattern not found.' });
    }
    return res.json(data);
  } catch (err) {
    console.error('roadmap pattern detail error:', err.message);
    return res.status(500).json({ message: 'Server error fetching roadmap pattern.' });
  }
};