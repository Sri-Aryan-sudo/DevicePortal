const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

router.get('/devices', deviceController.getDevices);
router.get('/devices/:mac', deviceController.getDeviceByMac);
router.post('/devices', deviceController.createDevice);
router.put('/devices/:mac', deviceController.updateDevice);
router.delete('/devices/:mac', deviceController.deleteDevice);
router.get('/statistics', deviceController.getStatistics);
router.get('/filter-options', deviceController.getFilterOptions);

module.exports = router;
