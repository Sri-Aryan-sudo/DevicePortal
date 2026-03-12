const express = require('express');
const router = express.Router();
const csvController = require('../controllers/csvController');
const { authenticateToken, verifyPOCorAdmin } = require('../middleware/auth');

// CSV upload endpoint - POC/ADMIN only
// Supports two modes:
// 1. Validation only: ?validateOnly=true
// 2. Upload and insert: no query param
router.post(
  '/upload-csv',
  authenticateToken,
  verifyPOCorAdmin,
  csvController.upload.single('file'),
  csvController.uploadCSV
);

module.exports = router;
