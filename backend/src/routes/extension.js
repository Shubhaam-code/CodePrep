const express = require('express');
const router = express.Router();
const ExtensionSubmission = require('../models/ExtensionSubmission');
const Question = require('../models/Question');
const User = require('../models/User');
const CompanyQuestion = require('../models/CompanyQuestion');
const submissionService = require('../services/submissionService');
const authMiddleware = require('../middleware/auth');

/**
 * @route   POST /api/extension/sync
 * @desc    Receive, validate, and save problem metadata synced from the browser extension
 * @access  Public (MVP Endpoint)
 */
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const { title, url, difficulty, status, language, code, company, challenge, day, pattern, sheet, syncContext } = req.body;
    console.log("REQ BODY COMPANY:", req.body.company);
    console.log("DESTRUCTURED COMPANY:", company);

    console.log("REQ BODY:", req.body);
    console.log("========================================");
    console.log("COMPANY RECEIVED:", company);
    console.log("TITLE RECEIVED:", title);
    console.log("CHALLENGE RECEIVED:", challenge);
    console.log("DAY RECEIVED:", day);
    console.log("========================================");

    // 1. Input Validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required and must be a non-empty string.' });
    }
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ success: false, error: 'URL is required and must be a non-empty string.' });
    }
    try {
      const parsedUrl = new URL(url);
      if (!parsedUrl.hostname.includes('leetcode.com')) {
        return res.status(400).json({ success: false, error: 'Invalid URL. Only LeetCode URLs are supported.' });
      }
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid URL format.' });
    }
    if (!difficulty || typeof difficulty !== 'string' || !difficulty.trim()) {
      return res.status(400).json({ success: false, error: 'Difficulty is required and must be a non-empty string.' });
    }
    if (!status || typeof status !== 'string' || !status.trim()) {
      return res.status(400).json({ success: false, error: 'Status is required and must be a non-empty string.' });
    }
    if (!language || typeof language !== 'string' || !language.trim()) {
      return res.status(400).json({ success: false, error: 'Language is required and must be a non-empty string.' });
    }
    if (code === undefined || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Code content is required and must be a string.' });
    }
    if (company !== undefined && company !== null && typeof company !== 'string') {
      return res.status(400).json({ success: false, error: 'Company context must be a string.' });
    }
    if (challenge !== undefined && challenge !== null && typeof challenge !== 'string') {
      return res.status(400).json({ success: false, error: 'Challenge context must be a string.' });
    }
    if (day !== undefined && day !== null && isNaN(Number(day))) {
      return res.status(400).json({ success: false, error: 'Day context must be a number.' });
    }
    if (challenge === "gv") {
      if (day === undefined || day === null || isNaN(Number(day)) || Number(day) < 1) {
        return res.status(400).json({ success: false, error: 'Day is required and must be a number greater than or equal to 1 for GV Challenge.' });
      }
    }

    console.log('\n========================================');
    console.log('📬 RECEIVED LEETCODE EXTENSION SYNC PAYLOAD');
    console.log('----------------------------------------');
    console.log(`Title:       ${title}`);
    console.log(`URL:         ${url}`);
    console.log(`Difficulty:  ${difficulty}`);
    console.log(`Status:      ${status}`);
    console.log(`Language:    ${language}`);
    console.log(`Code Length: ${code.length} chars`);
    console.log('========================================\n');

    // 2. Duplicate Protection (URL check)
    const existingSubmission = await ExtensionSubmission.findOne({ url: url.trim() });
    if (existingSubmission) {
      console.log(`ℹ️ Submission already exists for URL: ${url}. Skipping save.`);
      return res.status(200).json({
        success: true,
        saved: false,
        message: 'This submission has already been synced.'
      });
    }

    // 3. Find Question by title
    let question = await Question.findOne({ title: title.trim() });
    if (!question) {
      // Fallback: try case-insensitive matching
      const escapedTitle = title.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      question = await Question.findOne({ title: { $regex: new RegExp('^' + escapedTitle + '$', 'i') } });
    }

    if (!question) {
      console.warn(`⚠️ Rejecting sync: Question "${title}" does not exist in collection.`);
      return res.status(400).json({
        success: false,
        error: 'Question is not part of CodePrep company preparation database'
      });
    }

    // Verify it belongs to at least one CompanyQuestion mapping
    const isCompanyMapped = await CompanyQuestion.exists({ questionId: question._id });
    if (!isCompanyMapped) {
      console.warn(`⚠️ Rejecting sync: Question "${title}" is not mapped to any company.`);
      return res.status(400).json({
        success: false,
        error: 'Question is not part of CodePrep company preparation database'
      });
    }

    // 4. Find the user from authenticated request
    const user = await User.findById(req.user.id);
    if (!user) {
      console.error(`❌ Extension sync error: User not found with ID ${req.user.id}`);
      return res.status(404).json({
        success: false,
        error: 'Authenticated user not found.'
      });
    }

    // 5. Call existing submission service (solve logic)
    console.log("QUESTION:", question.title);
    console.log("QUESTION ID:", question._id.toString());
    console.log("COMPANY:", company);
    const result = await submissionService.saveSubmissionAndPush(
      user._id,
      question._id,
      code,
      language,
      company || null,
      challenge || null,
      day !== undefined && day !== null ? Number(day) : null,
      syncContext || null,
      pattern || null,
      sheet || null
    );

    // 6. Save to MongoDB (ExtensionSubmission history)
    const newSubmission = new ExtensionSubmission({
      title: title.trim(),
      url: url.trim(),
      difficulty: difficulty.trim(),
      status: status.trim(),
      language: language.trim(),
      code: code,
      source: 'leetcode-extension'
    });

    await newSubmission.save();
    console.log(`✅ Saved new ExtensionSubmission: ${title}`);

    // Log the output values as requested in req 8:
    console.log('\n========================================');
    console.log(`Question matched:   ${question.title}`);
    console.log(`questionId used:    ${question._id}`);
    console.log(`Github sync result: ${result.githubSynced}`);
    console.log('========================================\n');

    // 7. Return payload as requested
    return res.status(200).json({
      success: true,
      saved: true,
      questionMatched: question.title,
      questionId: question._id,
      questionIdUsed: question._id,
      githubSyncResult: result.githubSynced,
      githubSynced: result.githubSynced,
      githubSyncError: result.githubSyncError || null
    });
  } catch (error) {
    console.error('❌ Error handling extension sync request:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
