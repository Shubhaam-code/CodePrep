const express = require('express');
const router = express.Router();
const CompanyQuestion = require('../models/CompanyQuestion');

/**
 * @route   GET /api/companies
 */
router.get('/', async (req, res) => {
  try {
    const companies = await CompanyQuestion.distinct('company');
    companies.sort();
    res.status(200).json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/companies/meta
 * Returns enriched metadata for each company:
 * { name, questionCount, topTags }
 */
router.get('/meta', async (req, res) => {
  try {
    const Question = require('../models/Question');

    // Get all alltime records with populated question difficulty/tags
    const allRecords = await CompanyQuestion.find({ timeframe: 'alltime' })
      .populate({ path: 'questionId', select: 'difficulty tags topicTags' })
      .lean();

    // Group by company
    const byCompany = {};
    for (const record of allRecords) {
      if (!record.questionId) continue;
      const co = record.company;
      if (!byCompany[co]) byCompany[co] = { count: 0, tagFreq: {} };
      byCompany[co].count += 1;

      // Collect tags
      const tags = record.questionId.topicTags || record.questionId.tags || [];
      const tagList = Array.isArray(tags) ? tags : (typeof tags === 'string' ? [tags] : []);
      for (const t of tagList) {
        const tagName = typeof t === 'object' ? (t.name || t.slug) : t;
        if (tagName) {
          byCompany[co].tagFreq[tagName] = (byCompany[co].tagFreq[tagName] || 0) + 1;
        }
      }
    }

    const result = Object.entries(byCompany).map(([name, data]) => {
      const topTags = Object.entries(data.tagFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag);
      return { name, questionCount: data.count, topTags };
    });

    result.sort((a, b) => a.name.localeCompare(b.name));
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching companies meta:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


/**
 * @route   GET /api/companies/:name
 */
router.get('/:name', async (req, res) => {
  try {
    const companyName = req.params.name.toLowerCase().trim();
    const timeframe = req.query.timeframe || 'alltime';
    const difficulty = req.query.difficulty || 'All';

    // Populate question details
    const populateMatch = {};
    if (difficulty !== 'All') {
      populateMatch.difficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
    }

    const companyQuestions = await CompanyQuestion.find({
      company: companyName,
      timeframe: timeframe
    })
    .populate({
      path: 'questionId',
      match: populateMatch
    })
    .sort({ frequency: -1 });

    // Format results to a flattened structure as requested, with a fallback nested "question" property
    const formatted = companyQuestions
      .filter(cq => cq.questionId !== null)
      .map(cq => {
        const q = cq.questionId;
        return {
          _id: q._id,
          leetcodeId: q.leetcodeId,
          title: q.title,
          difficulty: q.difficulty,
          acceptance: q.acceptance,
          leetcodeUrl: q.leetcodeUrl,
          frequency: cq.frequency,
          timeframe: cq.timeframe,
          question: q // Nested object fallback for frontend consistency!
        };
      });

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
