const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const backupController = require('../controllers/backupController');

// All backup routes should be protected by authentication
router.use(protect);

// Get backup history
router.get('/', backupController.getBackups);

// Trigger manual backup
router.post('/manual', backupController.manualBackup);

// Download a backup zip file by google drive fileId
router.get('/:id/download', backupController.downloadBackup);

// Load backup into temp collection for preview
router.post('/restore-preview', backupController.restorePreview);

// Confirm restore of selected records
router.post('/restore-confirm', backupController.restoreConfirm);

// Delete backup
router.delete('/:id', backupController.deleteBackup);

module.exports = router;
