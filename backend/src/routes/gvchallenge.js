const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { parse } = require('csv-parse/sync');
const authMiddleware = require('../middleware/auth');
const GVChallenge = require('../models/GVChallenge');
const GVChallengeCache = require('../models/GVChallengeCache');

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

    // Check if already marked
    const existing = await GVChallenge.findOne({
      userId: req.user.id,
      dayNumber: Number(dayNumber),
    });

    if (existing) {
      // Update linkedinPosted if needed
      if (linkedinPosted && !existing.linkedinPosted) {
        existing.linkedinPosted = true;
        await existing.save();
      }
      return res.json({ success: true, alreadyDone: true, dayNumber });
    }

    await GVChallenge.create({
      userId: req.user.id,
      dayNumber: Number(dayNumber),
      questionTitle,
      questionUrl,
      solution: solution || '',
      language: language || '',
      topic: topic || '',
      difficulty: difficulty || '',
      completedAt: new Date(),
      linkedinPosted: !!linkedinPosted,
    });

    return res.json({ success: true, alreadyDone: false, dayNumber });
  } catch (error) {
    console.error('mark-complete error:', error.message);
    return res.status(500).json({ message: 'Server error marking challenge complete.' });
  }
});

// ─────────────────────────────────────────────
//  GET /api/gvchallenge/progress
//  Protected – returns user's completion progress + streak
// ─────────────────────────────────────────────
router.get('/progress', authMiddleware, async (req, res) => {
  try {
    const completions = await GVChallenge.find({ userId: req.user.id })
      .sort({ completedAt: -1 })
      .lean();

    // Calculate streak: consecutive days from today going backward
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateSet = new Set(
      completions.map((c) => {
        const d = new Date(c.completedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    let currentStreak = 0;
    let checkDate = new Date(today);

    while (true) {
      if (dateSet.has(checkDate.getTime())) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
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
      totalCompleted: completions.length,
      currentStreak,
      linkedinPosted,
    });
  } catch (error) {
    console.error('progress error:', error.message);
    return res.status(500).json({ message: 'Server error fetching progress.' });
  }
});

module.exports = router;
