const express = require('express');
const router = express.Router();
const ExtensionSubmission = require('../models/ExtensionSubmission');
const Question = require('../models/Question');
const User = require('../models/User');
const submissionService = require('../services/submissionService');

/**
 * @route   POST /api/extension/sync
 * @desc    Receive, validate, and save problem metadata synced from the browser extension
 * @access  Public (MVP Endpoint)
 */
router.post('/sync', async (req, res) => {
  try {
    const { title, url, difficulty, status, language, code } = req.body;

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
      console.error(`❌ Extension sync error: Question not found with title "${title}"`);
      return res.status(404).json({
        success: false,
        error: `Question not found with title: "${title}"`
      });
    }

    // 4. Find the system User
    const user = await User.findOne();
    if (!user) {
      console.error(`❌ Extension sync error: No User found in system.`);
      return res.status(404).json({
        success: false,
        error: 'No active user found in system.'
      });
    }

    // 5. Call existing submission service (solve logic)
    const result = await submissionService.saveSubmissionAndPush(
      user._id,
      question._id,
      code,
      language
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
      githubSynced: result.githubSynced
    });
  } catch (error) {
    console.error('❌ Error handling extension sync request:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
