const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const authMiddleware = require('../middleware/auth');

router.post('/solve', authMiddleware, submissionController.solveQuestion);

module.exports = router;
