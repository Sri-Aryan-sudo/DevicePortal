const pool = require('../config/db');

// ============================================
// CATEGORY DRILL-DOWN (PANEL, BOARD, STB)
// Team → Vendor → Model Type → Devices
// ============================================

// Get breakdown by team for a device type
const getTeamBreakdown = async (req, res) => {
  try {
    const { deviceType } = req.params;
    
    // Get team breakdown
    const breakdown = await pool.query(`
      SELECT team_name, COUNT(*) as count
      FROM devices
      WHERE device_type = $1 AND team_name IS NOT NULL
      GROUP BY team_name
      ORDER BY count DESC
    `, [deviceType]);

    // Get all devices for this device type (for the table)
    const devices = await pool.query(`
      SELECT *
      FROM devices
      WHERE device_type = $1
      ORDER BY team_name, vendor, model_type
    `, [deviceType]);

    res.json({
      breakdown: breakdown.rows,
      devices: devices.rows,
      level: 'team',
      deviceType
    });
  } catch (error) {
    console.error('Team breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch team breakdown' });
  }
};

// Get breakdown by vendor for a device type + team
const getVendorBreakdown = async (req, res) => {
  try {
    const { deviceType, team } = req.params;
    
    // Get vendor breakdown for this team
    const breakdown = await pool.query(`
      SELECT vendor, COUNT(*) as count
      FROM devices
      WHERE device_type = $1 AND team_name = $2 AND vendor IS NOT NULL
      GROUP BY vendor
      ORDER BY count DESC
    `, [deviceType, team]);

    // Get all devices for this device type + team
    const devices = await pool.query(`
      SELECT *
      FROM devices
      WHERE device_type = $1 AND team_name = $2
      ORDER BY vendor, model_type
    `, [deviceType, team]);

    res.json({
      breakdown: breakdown.rows,
      devices: devices.rows,
      level: 'vendor',
      deviceType,
      team
    });
  } catch (error) {
    console.error('Vendor breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor breakdown' });
  }
};

// Get breakdown by model_type for a device type + team + vendor
const getModelTypeBreakdown = async (req, res) => {
  try {
    const { deviceType, team, vendor } = req.params;
    
    // Get model_type breakdown
    const breakdown = await pool.query(`
      SELECT model_type, COUNT(*) as count
      FROM devices
      WHERE device_type = $1 
        AND team_name = $2 
        AND vendor = $3 
        AND model_type IS NOT NULL
      GROUP BY model_type
      ORDER BY count DESC
    `, [deviceType, team, vendor]);

    // Get all devices for this device type + team + vendor
    const devices = await pool.query(`
      SELECT *
      FROM devices
      WHERE device_type = $1 AND team_name = $2 AND vendor = $3
      ORDER BY model_type
    `, [deviceType, team, vendor]);

    res.json({
      breakdown: breakdown.rows,
      devices: devices.rows,
      level: 'model_type',
      deviceType,
      team,
      vendor
    });
  } catch (error) {
    console.error('Model type breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch model type breakdown' });
  }
};

// Get devices for a specific device type + team + vendor + model_type
const getDeviceList = async (req, res) => {
  try {
    const { deviceType, team, vendor, modelType } = req.params;
    
    const devices = await pool.query(`
      SELECT *
      FROM devices
      WHERE device_type = $1 
        AND team_name = $2 
        AND vendor = $3 
        AND model_type = $4
      ORDER BY mac_address
    `, [deviceType, team, vendor, modelType]);

    res.json({
      devices: devices.rows,
      level: 'devices',
      deviceType,
      team,
      vendor,
      modelType
    });
  } catch (error) {
    console.error('Device list error:', error);
    res.status(500).json({ error: 'Failed to fetch device list' });
  }
};

// ============================================
// TOTAL DEVICES DRILL-DOWN
// Device Type → Team → Vendor → Model Type → Devices
// ============================================

// Get breakdown by device_type (for Total Devices)
const getDeviceTypeBreakdown = async (req, res) => {
  try {
    const breakdown = await pool.query(`
      SELECT device_type, COUNT(*) as count
      FROM devices
      GROUP BY device_type
      ORDER BY count DESC
    `);

    const devices = await pool.query(`
      SELECT *
      FROM devices
      ORDER BY device_type, team_name, vendor
    `);

    res.json({
      breakdown: breakdown.rows,
      devices: devices.rows,
      level: 'device_type'
    });
  } catch (error) {
    console.error('Device type breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch device type breakdown' });
  }
};

// Get breakdown by team for a specific device_type (from Total drill-down)
const getTeamBreakdownForType = async (req, res) => {
  try {
    const { deviceType } = req.params;
    
    const breakdown = await pool.query(`
      SELECT team_name, COUNT(*) as count
      FROM devices
      WHERE device_type = $1 AND team_name IS NOT NULL
      GROUP BY team_name
      ORDER BY count DESC
    `, [deviceType]);

    const devices = await pool.query(`
      SELECT *
      FROM devices
      WHERE device_type = $1
      ORDER BY team_name, vendor
    `, [deviceType]);

    res.json({
      breakdown: breakdown.rows,
      devices: devices.rows,
      level: 'team',
      deviceType
    });
  } catch (error) {
    console.error('Team breakdown for type error:', error);
    res.status(500).json({ error: 'Failed to fetch team breakdown' });
  }
};

// ============================================
// VENDORS DRILL-DOWN
// Just Vendor Distribution (single level)
// ============================================

// Get breakdown by vendor (all vendors across all devices)
const getAllVendorsBreakdown = async (req, res) => {
  try {
    const breakdown = await pool.query(`
      SELECT vendor, COUNT(*) as count
      FROM devices
      WHERE vendor IS NOT NULL
      GROUP BY vendor
      ORDER BY count DESC
    `);

    const devices = await pool.query(`
      SELECT *
      FROM devices
      ORDER BY vendor
    `);

    res.json({
      breakdown: breakdown.rows,
      devices: devices.rows,
      level: 'vendor'
    });
  } catch (error) {
    console.error('All vendors breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor breakdown' });
  }
};

// ============================================
// NEW VENDOR-FIRST DRILL-DOWN
// Tile → Vendors → Model Types → Teams → Devices
// ============================================

// Get vendors for a specific device type
const getVendorBreakdownByType = async (req, res) => {
  try {
    const { deviceType } = req.params;
    
    const breakdown = await pool.query(`
      SELECT vendor, COUNT(*) as count
      FROM devices
      WHERE device_type = $1 AND vendor IS NOT NULL
      GROUP BY vendor
      ORDER BY count DESC
    `, [deviceType]);

    const devices = await pool.query(`
      SELECT *
      FROM devices
      WHERE device_type = $1
      ORDER BY vendor
    `, [deviceType]);

    res.json({
      breakdown: breakdown.rows,
      devices: devices.rows,
      level: 'vendor',
      deviceType
    });
  } catch (error) {
    console.error('Vendor breakdown by type error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor breakdown' });
  }
};

// Get model types for a vendor (all device types)
const getModelTypesByVendor = async (req, res) => {
  try {
    const { vendor } = req.params;
    
    const breakdown = await pool.query(`
      SELECT model_type, COUNT(*) as count
      FROM devices
      WHERE vendor = $1 AND model_type IS NOT NULL
      GROUP BY model_type
      ORDER BY count DESC
    `, [vendor]);

    const devices = await pool.query(`
      SELECT *
      FROM devices
      WHERE vendor = $1
      ORDER BY model_type
    `, [vendor]);

    res.json({
      breakdown: breakdown.rows,
      devices: devices.rows,
      level: 'model_type',
      vendor
    });
  } catch (error) {
    console.error('Model types by vendor error:', error);
    res.status(500).json({ error: 'Failed to fetch model types' });
  }
};

// Get model types for a vendor + device type
const getModelTypesByVendorAndType = async (req, res) => {
  try {
    const { deviceType, vendor } = req.params;
    
    const breakdown = await pool.query(`
      SELECT model_type, COUNT(*) as count
      FROM devices
      WHERE device_type = $1 AND vendor = $2 AND model_type IS NOT NULL
      GROUP BY model_type
      ORDER BY count DESC
    `, [deviceType, vendor]);

    const devices = await pool.query(`
      SELECT *
      FROM devices
      WHERE device_type = $1 AND vendor = $2
      ORDER BY model_type
    `, [deviceType, vendor]);

    res.json({
      breakdown: breakdown.rows,
      devices: devices.rows,
      level: 'model_type',
      deviceType,
      vendor
    });
  } catch (error) {
    console.error('Model types by vendor and type error:', error);
    res.status(500).json({ error: 'Failed to fetch model types' });
  }
};

// Get teams for a vendor + model type (all device types)
const getTeamsByVendorAndModel = async (req, res) => {
  try {
    const { vendor, modelType } = req.params;
    
    const breakdown = await pool.query(`
      SELECT team_name, COUNT(*) as count
      FROM devices
      WHERE vendor = $1 AND model_type = $2 AND team_name IS NOT NULL
      GROUP BY team_name
      ORDER BY count DESC
    `, [vendor, modelType]);

    const devices = await pool.query(`
      SELECT *
      FROM devices
      WHERE vendor = $1 AND model_type = $2
      ORDER BY team_name
    `, [vendor, modelType]);

    res.json({
      breakdown: breakdown.rows,
      devices: devices.rows,
      level: 'team',
      vendor,
      modelType
    });
  } catch (error) {
    console.error('Teams by vendor and model error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

// Get teams for device type + vendor + model type
const getTeamsByTypeVendorAndModel = async (req, res) => {
  try {
    const { deviceType, vendor, modelType } = req.params;
    
    const breakdown = await pool.query(`
      SELECT team_name, COUNT(*) as count
      FROM devices
      WHERE device_type = $1 AND vendor = $2 AND model_type = $3 AND team_name IS NOT NULL
      GROUP BY team_name
      ORDER BY count DESC
    `, [deviceType, vendor, modelType]);

    const devices = await pool.query(`
      SELECT *
      FROM devices
      WHERE device_type = $1 AND vendor = $2 AND model_type = $3
      ORDER BY team_name
    `, [deviceType, vendor, modelType]);

    res.json({
      breakdown: breakdown.rows,
      devices: devices.rows,
      level: 'team',
      deviceType,
      vendor,
      modelType
    });
  } catch (error) {
    console.error('Teams by type, vendor and model error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

// ============================================
// PLACEMENT TYPE DRILL-DOWN
// Placement Types → Vendors → Model Types → Teams → Devices
// ============================================

// Get all placement types breakdown
const getAllPlacementTypesBreakdown = async (req, res) => {
  try {
    const breakdown = await pool.query(`
      SELECT placement_type, COUNT(*) as count
      FROM devices
      WHERE placement_type IS NOT NULL
      GROUP BY placement_type
      ORDER BY count DESC
    `);

    const devices = await pool.query(`
      SELECT *
      FROM devices
      WHERE placement_type IS NOT NULL
      ORDER BY placement_type
    `);

    res.json({
      breakdown: breakdown.rows,
      devices: devices.rows,
      level: 'placement_type'
    });
  } catch (error) {
    console.error('Placement type breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch placement type breakdown' });
  }
};

// Get vendors for a specific placement type
const getVendorsByPlacementType = async (req, res) => {
  try {
    const { placementType } = req.params;

    const breakdown = await pool.query(`
      SELECT vendor, COUNT(*) as count
      FROM devices
      WHERE placement_type = $1 AND vendor IS NOT NULL
      GROUP BY vendor
      ORDER BY count DESC
    `, [placementType]);

    const devices = await pool.query(`
      SELECT *
      FROM devices
      WHERE placement_type = $1
      ORDER BY vendor
    `, [placementType]);

    res.json({
      breakdown: breakdown.rows,
      devices: devices.rows,
      level: 'vendor',
      placementType
    });
  } catch (error) {
    console.error('Vendors by placement type error:', error);
    res.status(500).json({ error: 'Failed to fetch vendors by placement type' });
  }
};

module.exports = {
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
};
