const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const googleController = require('../controllers/googleController');

// Open routes (OAuth redirect needs to be open since Google redirects directly to it)
router.get('/callback', googleController.oauthCallback);

// Protected routes (Admin initiated)
router.get('/auth', protect, googleController.getAuthUrl);
router.get('/status', protect, googleController.getStatus);
router.post('/disconnect', protect, googleController.disconnect);

module.exports = router;
