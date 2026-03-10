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

module.exports = {
  getTeamBreakdown,
  getVendorBreakdown,
  getModelTypeBreakdown,
  getDeviceList,
  getDeviceTypeBreakdown,
  getTeamBreakdownForType,
  getAllVendorsBreakdown
};
