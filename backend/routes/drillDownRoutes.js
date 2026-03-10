const express = require('express');
const router = express.Router();
const {
  getTeamBreakdown,
  getVendorBreakdown,
  getModelTypeBreakdown,
  getDeviceList,
  getDeviceTypeBreakdown,
  getTeamBreakdownForType,
  getAllVendorsBreakdown
} = require('../controllers/drillDownController');

// ============================================
// CATEGORY DRILL-DOWN (PANEL, BOARD, STB)
// Team → Vendor → Model Type → Devices
// ============================================

// Level 1: Team breakdown
router.get('/drilldown/:deviceType/teams', getTeamBreakdown);

// Level 2: Vendor breakdown (filtered by team)
router.get('/drilldown/:deviceType/teams/:team/vendors', getVendorBreakdown);

// Level 3: Model type breakdown (filtered by team + vendor)
router.get('/drilldown/:deviceType/teams/:team/vendors/:vendor/models', getModelTypeBreakdown);

// Level 4: Device list (filtered by team + vendor + model_type)
router.get('/drilldown/:deviceType/teams/:team/vendors/:vendor/models/:modelType/devices', getDeviceList);

// ============================================
// TOTAL DEVICES DRILL-DOWN
// Device Type → Team → Vendor → Model Type → Devices
// ============================================

// Level 1: Device type breakdown (for Total Devices)
router.get('/drilldown/total/device-types', getDeviceTypeBreakdown);

// Level 2: Team breakdown for a device type (from Total)
router.get('/drilldown/total/device-types/:deviceType/teams', getTeamBreakdownForType);

// Levels 3-4 reuse existing routes above

// ============================================
// VENDORS DRILL-DOWN
// Just Vendor Distribution
// ============================================

// Single level: All vendors breakdown
router.get('/drilldown/vendors/all', getAllVendorsBreakdown);

module.exports = router;
