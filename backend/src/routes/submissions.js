const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const authMiddleware = require('../middleware/auth');

router.post('/solve', authMiddleware, submissionController.solveQuestion);

// Company submission history feed (powers the History page now that
// it has been migrated off the GV Challenge feed). Newest first;
// filters out every syncContext the spec calls out.
router.get('/history/company', authMiddleware, submissionController.getCompanyHistory);

module.exports = router;
