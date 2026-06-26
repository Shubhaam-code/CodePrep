const fs = require('fs');
const path = require('path');
const Question = require('../models/Question');
const Submission = require('../models/Submission');

const ROADMAP_PATH = path.join(__dirname, '../../data/roadmap.json');

/**
 * Read the roadmap source-of-truth file once per request. Roadmap
 * is small (~22 patterns) so no caching layer is warranted here;
 * keep the call cheap and synchronous so the caller can do a single
 * ordered pass without juggling promises.
 *
 * Throws if the file is missing or malformed so the route layer
 * can return a clean 500.
 */
const loadRoadmap = () => {
  if (!fs.existsSync(ROADMAP_PATH)) {
    throw new Error(`roadmap.json not found at ${ROADMAP_PATH}`);
  }
  const roadmap = JSON.parse(fs.readFileSync(ROADMAP_PATH, 'utf8'));
  if (!Array.isArray(roadmap)) {
    throw new Error('roadmap.json must be an array of patterns.');
  }
  return roadmap;
};

/**
 * Aggregate Question stats grouped by `roadmapPattern`. One Mongo
 * round-trip — returns the same shape the seeder wrote so we can
 * trust the field values are non-null on rows that exist.
 *
 *   _id              — patternId
 *   totalQuestions   — count of Questions tagged with this pattern
 *   roadmapCategory  — derived from the first Question in the group;
 *                      every Question in a pattern shares the same
 *                      category (the seeder writes both fields from
 *                      the same source mapping) so $first is safe.
 */
const aggregatePatternStats = async () => {
  return Question.aggregate([
    {
      $match: {
        roadmapPattern:  { $ne: null },
        roadmapCategory: { $ne: null },
      },
    },
    {
      $group: {
        _id:             '$roadmapPattern',
        totalQuestions:  { $sum: 1 },
        roadmapCategory: { $first: '$roadmapCategory' },
      },
    },
  ]);
};

/**
 * Fetch the set of Question _id strings this user has ever
 * submitted. Single round-trip; lean() so we don't pull Mongoose
 * overhead into a Set. Phase 5.4 — solvedQuestions / progress
 * are computed downstream from this Set.
 */
const fetchSolvedQuestionIds = async (userId) => {
  if (!userId) return new Set();
  const subs = await Submission.find({ userId })
    .select('questionId')
    .lean();
  const out = new Set();
  for (const s of subs) {
    if (s.questionId) out.add(String(s.questionId));
  }
  return out;
};

/**
 * One-shot aggregate that returns per-pattern totalQuestions AND
 * solvedQuestions, plus roadmapCategory. Replaces the previous
 * aggregatePatternStats when a userId is supplied so Phase 5.4
 * needs only 1 Question query + 1 Submission query total.
 *
 *   _id              — patternId
 *   totalQuestions   — count of Questions tagged with this pattern
 *   solvedQuestions  — count of Questions in this pattern whose
 *                      _id appears in the user's Submission history
 *   roadmapCategory  — derived from the first Question in the group
 */
const aggregatePatternStatsWithSolved = async (userId, solvedIdStrings) => {
  // When no userId is supplied, force solvedQuestions to 0 so the
  // downstream loop doesn't need to special-case it.
  const solvedSum = userId
    ? { $sum: { $cond: [{ $in: ['$_id', solvedIdStrings] }, 1, 0] } }
    : { $sum: 0 };

  return Question.aggregate([
    {
      $match: {
        roadmapPattern:  { $ne: null },
        roadmapCategory: { $ne: null },
      },
    },
    {
      $group: {
        _id:             '$roadmapPattern',
        totalQuestions:  { $sum: 1 },
        roadmapCategory: { $first: '$roadmapCategory' },
        solvedQuestions: solvedSum,
      },
    },
  ]);
};

/**
 * Build the roadmap list response.
 *
 * For each pattern in roadmap.json (in source order) produce:
 *   patternId         — from pattern.patternId
 *   patternName       — from pattern.name (NOT hardcoded)
 *   roadmapCategory   — taken from the matching Question group; falls
 *                       back to null when no Questions are tagged yet
 *   totalQuestions    — count of Questions with this roadmapPattern
 *   solvedQuestions   — Phase 5.4: count of those Questions this
 *                       user has at least one Submission for
 *   progress          — Phase 5.4: round(solvedQuestions /
 *                       totalQuestions * 100), or 0 when no Questions
 *                       are tagged yet (avoids /0)
 *   roadmapOrder      — pattern's 0-indexed position in roadmap.json
 *
 * Output order follows roadmap.json order, NOT Question-collection
 * order, so the roadmap is stable across DB churn.
 *
 * Query budget (Phase 5.4):
 *   1. Submission.find({ userId })         — solved questionIds Set
 *   2. Question.aggregate(...)              — totalQuestions +
 *                                            solvedQuestions per
 *                                            pattern in one shot
 * No N+1 — both queries are O(1) regardless of pattern count.
 */
exports.listRoadmapPatterns = async (userId) => {
  const roadmap = loadRoadmap();

  // Phase 5.4 — one round-trip to fetch this user's solved Set.
  const solvedSet = await fetchSolvedQuestionIds(userId);
  const solvedIdStrings = Array.from(solvedSet);

  // Single aggregate over Question collection that returns both
  // totals and per-user solved counts. Avoids the previous two-step
  // (count + per-pattern subquery) that would have been O(patterns).
  const stats = await aggregatePatternStatsWithSolved(userId, solvedIdStrings);

  const statsByPattern = new Map();
  for (const row of stats) {
    statsByPattern.set(row._id, {
      totalQuestions:  row.totalQuestions,
      roadmapCategory: row.roadmapCategory,
      solvedQuestions: row.solvedQuestions || 0,
    });
  }

  const result = [];
  for (let i = 0; i < roadmap.length; i += 1) {
    const pattern = roadmap[i];
    const patternId = pattern.patternId;
    const s = statsByPattern.get(patternId);

    const totalQuestions  = s ? s.totalQuestions  : 0;
    const solvedQuestions = s ? s.solvedQuestions : 0;
    const progress = totalQuestions === 0
      ? 0
      : Math.round((solvedQuestions / totalQuestions) * 100);

    result.push({
      patternId,
      patternName:     pattern.name,
      roadmapCategory: s ? s.roadmapCategory : null,
      roadmapOrder:    i,
      totalQuestions,
      solvedQuestions,
      progress,
    });
  }

  return result;
};

/**
 * Build a single-pattern detail response for Phase 5.2/5.3.
 *
 *   1. Resolve patternId against roadmap.json — return null when
 *      not present so the route layer can emit a clean 404. The
 *      "exists in roadmap" check is the source of truth for 404;
 *      Questions may be empty even when the pattern is valid.
 *   2. Pull every Question tagged with this pattern, sorted by
 *      roadmapOrder ascending (tiebreaker leetcodeId).
 *   3. Pull every Submission for this user (Phase 5.3) and build a
 *      Set<questionId> so each Question can be stamped solved:true
 *      in O(1) per row. The questionId field is an ObjectId ref to
 *      Question, so direct equality against q._id (also ObjectId)
 *      works without string conversion.
 *   4. Project only the fields the spec asks for.
 *
 * Returned shape:
 *   {
 *     patternId, patternName, roadmapCategory,
 *     totalQuestions,          // = questions.length
 *     questions: [ { _id, leetcodeId, title, difficulty,
 *                    leetcodeUrl, roadmapOrder, solved } ]
 *   }
 */
exports.getPatternById = async (patternId, userId) => {
  const normalizedId = String(patternId || '').trim().toLowerCase();
  if (!normalizedId) return null;

  const roadmap = loadRoadmap();
  const patternIndex = roadmap.findIndex(
    (p) => String(p.patternId || '').toLowerCase() === normalizedId
  );
  if (patternIndex === -1) return null;

  const pattern = roadmap[patternIndex];

  const docs = await Question.find({ roadmapPattern: normalizedId })
    .select(
      '_id leetcodeId title difficulty leetcodeUrl roadmapOrder ' +
      'roadmapCategory'
    )
    .sort({ roadmapOrder: 1, leetcodeId: 1 })
    .lean();

  // Every Question in a pattern shares the same roadmapCategory
  // (the seeder writes both fields from the same source mapping) so
  // the first doc's category is the pattern's category. Fall back
  // to null when no Questions are tagged yet.
  const roadmapCategory = docs.length > 0 ? docs[0].roadmapCategory : null;

  // Phase 5.3 — solved status. One round-trip per request: pull
  // every questionId this user has ever submitted, regardless of
  // pattern, then memoise in a Set so the per-question stamp is
  // O(1). project the questionId field only — no full doc hydration
  // — and lean() so we don't pull Mongoose overhead into a Set.
  const solvedSet = new Set();
  if (userId) {
    const submissions = await Submission.find({ userId })
      .select('questionId')
      .lean();
    for (const s of submissions) {
      if (s.questionId) solvedSet.add(String(s.questionId));
    }
  }

  const questions = docs.map((q) => ({
    _id:          q._id,
    leetcodeId:   q.leetcodeId,
    title:        q.title,
    difficulty:   q.difficulty,
    leetcodeUrl:  q.leetcodeUrl,
    roadmapOrder: q.roadmapOrder,
    solved:       solvedSet.has(String(q._id)),
  }));

  return {
    patternId,
    patternName:     pattern.name,
    roadmapCategory,
    totalQuestions:  questions.length,
    questions,
  };
};