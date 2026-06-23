const express = require('express');
const router = express.Router();
const githubRepositoryController = require('../controllers/githubRepositoryController');
const authMiddleware = require('../middleware/auth');

router.post('/create-repository', authMiddleware, githubRepositoryController.createPrepRepository);
router.post('/create-company-folder', authMiddleware, githubRepositoryController.createCompanyFolder);
router.post('/push-question', authMiddleware, githubRepositoryController.pushQuestion);

module.exports = router;
