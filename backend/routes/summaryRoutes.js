const express = require('express');
const router = express.Router();
const { getSummary, getDashboardStats } = require('../controllers/summaryController');
const { protect } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboardStats);
router.get('/', protect, getSummary);

module.exports = router;
