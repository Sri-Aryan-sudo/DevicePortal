const express = require('express');
const router = express.Router();
const { getDataQuality } = require('../controllers/dataQualityController');

router.get('/data-quality', getDataQuality);

module.exports = router;
