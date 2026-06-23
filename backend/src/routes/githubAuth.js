const express = require('express');
const router = express.Router();
const githubAuthController = require('../controllers/githubAuthController');

router.get('/', githubAuthController.redirectToGithub);
router.get('/callback', githubAuthController.handleGithubCallback);

module.exports = router;
