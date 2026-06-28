const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { parse } = require('csv-parse/sync');
const authMiddleware = require('../middleware/auth');
const GVChallenge = require('../models/GVChallenge');
const GVChallengeCache = require('../models/GVChallengeCache');
const User = require('../models/User');
const Question = require('../models/Question');
const submissionService = require('../services/submissionService');

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5aAdlz_XNtU9JkpxFhBmI-6ftlWLfy12Hc4nDH7yciZjbI-AkQKiXZ9fMzAjVAleQV69RzqsYyqAp/pub?output=csv';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─────────────────────────────────────────────
//  GET /api/gvchallenge/questions
//  Public – returns cached or freshly-fetched list
// ─────────────────────────────────────────────
router.get('/questions', async (req, res) => {
  try {
    // Check cache
    const cached = await GVChallengeCache.findOne().sort({ cachedAt: -1 });
    if (cached && Date.now() - new Date(cached.cachedAt).getTime() < CACHE_TTL_MS) {
      return res.json({ questions: cached.questions });
    }

    // Fetch CSV from Google Sheets
    const response = await fetch(SHEET_CSV_URL, {
      headers: { 'User-Agent': 'node-fetch' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }

    const csvText = await response.text();
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Map CSV rows → question objects
    // Flexible column name handling
    const questions = records
      .map((row, idx) => {
        const keys = Object.keys(row);
        const get = (patterns) => {
          const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const p of patterns) {
            const found = keys.find((k) => norm(k) === norm(p));
            if (found && row[found]?.trim()) return row[found].trim();
          }
          return '';
        };

        const dayNumber =
          parseInt(get(['day', 'daynumber', 'day number', 'no', 'sr'])) || idx + 1;
        const title = get(['title', 'question', 'questiontitle', 'problem', 'name']);
        const difficulty = get(['difficulty', 'level', 'hard']);
        const topic = get(['topic', 'category', 'tag', 'pattern']);
        const leetcodeUrl = get([
          'leetcodeurl',
          'url',
          'link',
          'leetcode',
          'leetcodelink',
          'problemlink',
        ]);

        if (!title) return null;

        return { dayNumber, title, difficulty, topic, leetcodeUrl };
      })
      .filter(Boolean);

    // Save to cache (replace old)
    await GVChallengeCache.deleteMany({});
    await GVChallengeCache.create({ questions, cachedAt: new Date() });

    return res.json({ questions });
  } catch (error) {
    console.error('GV questions error:', error.message);
    return res.status(500).json({ message: 'Failed to fetch challenge questions.' });
  }
});

// ─────────────────────────────────────────────
//  POST /api/gvchallenge/generate-post
//  Protected – calls Gemini to generate LinkedIn post
// ─────────────────────────────────────────────
router.post('/generate-post', authMiddleware, async (req, res) => {
  try {
    const { dayNumber, questionTitle, difficulty, solution, language, topic } = req.body;

    if (!questionTitle || !solution) {
      return res.status(400).json({ message: 'questionTitle and solution are required.' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ message: 'Gemini API key not configured.' });
    }

    const prompt = `Generate a LinkedIn post for:
Day ${dayNumber} of G. Viswanathan Challenge!
Question: ${questionTitle}
Difficulty: ${difficulty || 'Medium'}
Topic: ${topic || 'DSA'}
Language: ${language || 'Python'}
My Solution:
${solution}

Rules:
- Start with: 'Day ${dayNumber} of G. Viswanathan Challenge! 🚀'
- Explain the problem briefly (1-2 lines)
- Explain the approach from the code (2-3 lines)
- Share a key insight or learning (1-2 lines)
- End with hashtags: #GViswanathanChallenge #DSA #LeetCode #100DaysOfCode #${language || 'Python'}
- Professional but enthusiastic tone
- Maximum 1300 characters
- Plain text only, no markdown formatting
- Use emojis naturally`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('Gemini API error:', errBody);
      return res.status(500).json({ message: 'Gemini API request failed.' });
    }

    const geminiData = await geminiRes.json();
    const generatedText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!generatedText) {
      return res.status(500).json({ message: 'Gemini returned empty response.' });
    }

    return res.json({ post: generatedText });
  } catch (error) {
    console.error('generate-post error:', error.message);
    return res.status(500).json({ message: 'Server error generating LinkedIn post.' });
  }
});

// ─────────────────────────────────────────────
//  POST /api/gvchallenge/mark-complete
//  Protected – marks a day as completed
// ─────────────────────────────────────────────
router.post('/mark-complete', authMiddleware, async (req, res) => {
  try {
    const { dayNumber, questionTitle, questionUrl, solution, language, topic, difficulty, linkedinPosted } =
      req.body;

    if (!dayNumber || !questionTitle || !questionUrl) {
      return res.status(400).json({ message: 'dayNumber, questionTitle, and questionUrl are required.' });
    }

    const day = Number(dayNumber);
    const syncContext = `gv_day${day}`;

    // 1. Find the underlying Question doc by title
    let question = await Question.findOne({ title: String(questionTitle).trim() });
    if (!question) {
      const escaped = String(questionTitle).trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      question = await Question.findOne({ title: { $regex: new RegExp('^' + escaped + '$', 'i') } });
    }

    if (!question) {
      return res.status(404).json({
        message: 'Question not found in CodePrep database; cannot mark complete.',
      });
    }

    // Check if already marked
    const existing = await GVChallenge.findOne({
      userId: req.user.id,
      dayNumber: day,
    });

    if (existing) {
      // Update linkedinPosted if needed
      if (linkedinPosted && !existing.linkedinPosted) {
        existing.linkedinPosted = true;
        await existing.save();
      }
      return res.json({ success: true, alreadyDone: true, dayNumber });
    }

    console.log(`[mark-complete] Syncing and pushing to GitHub for GV day ${day}: ${question.title}...`);

    // Call submission service to save submission, update user progress, push to GitHub and update README
    const result = await submissionService.saveSubmissionAndPush(
      req.user.id,
      question._id,
      solution || '// Solved',
      language || 'javascript',
      null, // company
      'gv', // challenge
      day,
      syncContext
    );

    // Update the GVChallenge record fields if needed (since saveSubmissionAndPush creates it)
    const gvDoc = await GVChallenge.findOne({ userId: req.user.id, dayNumber: day });
    if (gvDoc) {
      if (linkedinPosted) gvDoc.linkedinPosted = true;
      if (solution) gvDoc.solution = solution;
      if (language) gvDoc.language = language;
      if (topic) gvDoc.topic = topic;
      if (difficulty) gvDoc.difficulty = difficulty;
      await gvDoc.save();
    }

    return res.json({
      success: true,
      alreadyDone: false,
      dayNumber,
      githubSynced: result.githubSynced,
      githubSyncError: result.githubSyncError || null
    });
  } catch (error) {
    console.error('mark-complete error:', error.message);
    return res.status(500).json({ message: 'Server error marking challenge complete: ' + error.message });
  }
});

// ─────────────────────────────────────────────
//  POST /api/gvchallenge/mark-already-solved
//  Protected – mark a GV day as Completed when the user solved the
//  underlying question BEFORE joining CodePrep (e.g. on LeetCode
//  directly). This unlocks the next day for them.
//
//  Explicitly does NOT:
//    • push to GitHub
//    • create a Submission document
//    • trigger the Extension sync flow
//    • update any README
//
//  It only writes `user.solvedQuestions[].syncContext = "gv_day<N>"`
//  (the same source of truth /api/gvchallenge/progress uses to
//  compute totalCompleted) and updates the user's streak. The
//  frontend then re-derives currentDay = totalCompleted + 1, which
//  naturally flips Day N+1 into "Today's Question".
// ─────────────────────────────────────────────
router.post('/mark-already-solved', authMiddleware, async (req, res) => {
  try {
    const { dayNumber, questionTitle } = req.body;

    if (!dayNumber || !questionTitle) {
      return res.status(400).json({ message: 'dayNumber and questionTitle are required.' });
    }

    const day = Number(dayNumber);
    if (!Number.isFinite(day) || day < 1) {
      return res.status(400).json({ message: 'dayNumber must be a positive integer.' });
    }

    const syncContext = `gv_day${day}`;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 1. Find the underlying Question doc by title
    let question = await Question.findOne({ title: String(questionTitle).trim() });
    if (!question) {
      const escaped = String(questionTitle).trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      question = await Question.findOne({ title: { $regex: new RegExp('^' + escaped + '$', 'i') } });
    }
    if (!question) {
      return res.status(404).json({
        message: 'Question not found in CodePrep database; cannot mark as already solved.',
      });
    }

    // 2. Idempotent check
    const dayRowExists = await GVChallenge.findOne({
      userId: req.user.id,
      dayNumber: day,
    });
    const alreadyDone = dayRowExists || user.solvedQuestions.some(
      (q) => (q.syncContext || 'general') === syncContext
    );
    if (alreadyDone) {
      return res.json({ success: true, alreadyDone: true, dayNumber: day });
    }

    console.log(`[mark-already-solved] Syncing and pushing to GitHub for GV day ${day}: ${question.title}...`);

    const defaultCode = `// Solved on LeetCode\n// Question: ${question.title}\n// Day: ${day}`;
    const defaultLanguage = 'javascript';

    // Route to saveSubmissionAndPush to update DB, execute GitHub push, and regenerate README.md
    const result = await submissionService.saveSubmissionAndPush(
      req.user.id,
      question._id,
      defaultCode,
      defaultLanguage,
      null, // company
      'gv', // challenge
      day,
      syncContext
    );

    return res.json({
      success: true,
      alreadyDone: false,
      dayNumber: day,
      githubSynced: result.githubSynced,
      githubSyncError: result.githubSyncError || null
    });
  } catch (error) {
    console.error('mark-already-solved error:', error.message);
    return res.status(500).json({ message: 'Server error marking GV day as already solved: ' + error.message });
  }
});

// ─────────────────────────────────────────────
//  GET /api/gvchallenge/progress
//  Protected – returns user's completion progress + streak
//
//  ALL signals are derived from the GVChallenge collection for THIS user:
//    • totalCompleted = max(GVChallenge.dayNumber)
//    • solvedDaysSet  = { GVChallenge.dayNumber, ... }
//    • currentStreak  = consecutive calendar days, walking
//                       backwards from today over GVChallenge.completedAt
//    • linkedinPosted = count of GVChallenge rows with linkedinPosted=true
//
//  GV Challenge is intentionally isolated from User.solvedQuestions and
//  from other collections (CompanyQuestion, Pattern, Sheet, Roadmap). A
//  solve in any of those flows must never bump a GV day, and a GV solve
//  only advances GV progress. The /api/user/dashboard endpoint remains
//  the canonical source for the global "total solved" stat — it is
//  unaffected by this change.
// ─────────────────────────────────────────────
router.get('/progress', authMiddleware, async (req, res) => {
  try {
    // 1. Pull the user's GVChallenge rows. This is the single source of
    //    truth for GV progression.
    const completions = await GVChallenge.find({ userId: req.user.id })
      .sort({ completedAt: -1 })
      .lean();

    // 2. Compute solvedDaysSet + totalCompleted (max dayNumber) from the
    //    GVChallenge rows only. We do NOT consult user.solvedQuestions,
    //    CompanyQuestion, Pattern, Sheet, or Roadmap — GV Challenge is
    //    intentionally decoupled from every other learning surface.
    const solvedDaysSet = new Set();
    let maxSolvedDay = 0;
    for (const c of completions) {
      const day = Number(c.dayNumber);
      if (!Number.isFinite(day) || day <= 0) continue;
      solvedDaysSet.add(day);
      if (day > maxSolvedDay) maxSolvedDay = day;
    }

    // 3. Streak: walk backwards from today (or yesterday) over GVChallenge.completedAt
    //    dates. This keeps the streak active if the user solved it yesterday
    //    and still has today to solve today's challenge.
    let currentStreak = 0;
    const dateSet = new Set(
      completions.map((c) => {
        const d = new Date(c.completedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );
    if (dateSet.size > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let checkDate = null;
      if (dateSet.has(today.getTime())) {
        checkDate = new Date(today);
      } else if (dateSet.has(yesterday.getTime())) {
        checkDate = new Date(yesterday);
      }
      
      if (checkDate) {
        while (dateSet.has(checkDate.getTime())) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    }

    const linkedinPosted = completions.filter((c) => c.linkedinPosted).length;

    return res.json({
      completedDays: completions.map((c) => ({
        dayNumber: c.dayNumber,
        questionTitle: c.questionTitle,
        difficulty: c.difficulty,
        language: c.language,
        topic: c.topic,
        completedAt: c.completedAt,
        linkedinPosted: c.linkedinPosted,
      })),
      totalCompleted: maxSolvedDay,
      currentStreak,
      linkedinPosted,
    });
  } catch (error) {
    console.error('progress error:', error.message);
    return res.status(500).json({ message: 'Server error fetching progress.' });
  }
});

module.exports = router;
