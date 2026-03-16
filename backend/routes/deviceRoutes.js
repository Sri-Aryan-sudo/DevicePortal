const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticateToken, verifyPOCorAdmin } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/devices', deviceController.getDevices);
router.get('/devices/:mac', deviceController.getDeviceByMac);
router.get('/statistics', deviceController.getStatistics);
router.get('/filter-options', deviceController.getFilterOptions);

// Protected routes (authentication required)
router.post('/devices', deviceController.createDevice);
router.put('/devices/:mac', deviceController.updateDevice);
router.delete('/devices/:mac', deviceController.deleteDevice);

// POC/ADMIN-only route for editing device details from Device Detail page
router.put('/devices/:mac/poc-edit', authenticateToken, verifyPOCorAdmin, deviceController.updateDeviceByPOC);

module.exports = router;
