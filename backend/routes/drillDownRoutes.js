const express = require('express');
const router = express.Router();
const {
  getTeamBreakdown,
  getVendorBreakdown,
  getModelTypeBreakdown,
  getDeviceList,
  getDeviceTypeBreakdown,
  getTeamBreakdownForType,
  getAllVendorsBreakdown,
  // New vendor-first drill-down
  getVendorBreakdownByType,
  getModelTypesByVendor,
  getModelTypesByVendorAndType,
  getTeamsByVendorAndModel,
  getTeamsByTypeVendorAndModel,
  // Placement type drill-down
  getAllPlacementTypesBreakdown,
  getVendorsByPlacementType
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

// ============================================
// NEW: VENDOR-FIRST DRILL-DOWN
// Tile → Vendors → Model Types → Teams → Devices
// ============================================

// Level 1: Vendors for a device type
router.get('/drilldown/:deviceType/vendors', getVendorBreakdownByType);

// Level 2a: Model types for a vendor (all device types)
router.get('/drilldown/vendors/:vendor/models', getModelTypesByVendor);

// Level 2b: Model types for a vendor + device type
router.get('/drilldown/:deviceType/vendors/:vendor/models', getModelTypesByVendorAndType);

// Level 3a: Teams for vendor + model type (all device types)
router.get('/drilldown/vendors/:vendor/models/:modelType/teams', getTeamsByVendorAndModel);

// Level 3b: Teams for device type + vendor + model type
router.get('/drilldown/:deviceType/vendors/:vendor/models/:modelType/teams', getTeamsByTypeVendorAndModel);

// Level 4: Final device list (use existing deviceAPI.getDevices with filters)

// ============================================
// PLACEMENT TYPE DRILL-DOWN
// Placement Types → Vendors → Model Types → Teams → Devices
// ============================================

// Level 1: All placement types breakdown
router.get('/drilldown/placement-types/all', getAllPlacementTypesBreakdown);

// Level 2: Vendors for a specific placement type
router.get('/drilldown/placement-types/:placementType/vendors', getVendorsByPlacementType);

module.exports = router;
