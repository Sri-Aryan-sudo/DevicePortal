const pool = require('../config/db');

const getDevices = async (req, res) => {
  try {
    const {
      search = '',
      deviceType = '',
      status = '',
      vendor = '',
      team = '',
      sortBy = 'mac_address',
      sortOrder = 'asc',
      page = 1,
      limit = 15
    } = req.query;

    let query = 'SELECT * FROM devices WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (mac_address ILIKE $${paramCount} OR model_name ILIKE $${paramCount} OR model_alias ILIKE $${paramCount})`;
      paramCount++;
    }

    if (deviceType) {
      params.push(deviceType);
      query += ` AND device_type = $${paramCount}`;
      paramCount++;
    }

    if (vendor) {
      params.push(vendor);
      query += ` AND vendor = $${paramCount}`;
      paramCount++;
    }

    if (team) {
      params.push(team);
      query += ` AND team_name = $${paramCount}`;
      paramCount++;
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0].count);

    const validSortColumns = ['mac_address', 'model_name', 'device_type', 'vendor', 'team_name', 'location_site'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'mac_address';
    const sortDirection = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    query += ` ORDER BY ${sortColumn} ${sortDirection}`;

    // Support fetching all records by using a very high limit
    const actualLimit = parseInt(limit);
    const usePagination = actualLimit < 10000;
    
    if (usePagination) {
      const offset = (parseInt(page) - 1) * actualLimit;
      params.push(actualLimit, offset);
      query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    }

    const result = await pool.query(query, params);

    res.json({
      devices: result.rows,
      pagination: {
        total: totalRecords,
        page: parseInt(page),
        limit: actualLimit,
        totalPages: Math.ceil(totalRecords / actualLimit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
};

const getDeviceByMac = async (req, res) => {
  try {
    const { mac } = req.params;
    const result = await pool.query('SELECT * FROM devices WHERE mac_address = $1', [mac]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch device' });
  }
};

const createDevice = async (req, res) => {
  try {
    const {
      mac_address,
      model_name,
      model_alias,
      model_type,
      device_type,
      vendor,
      rack,
      location_scope,
      location_site,
      placement_type,
      team_name,
      usage_purpose,
      owner_name,
      utilization_week_7,
      utilization_week_8,
      automation_filter,
      infra_tickets,
      device_repurpose
    } = req.body;

    const result = await pool.query(
      `INSERT INTO devices (
        mac_address, model_name, model_alias, model_type, device_type, vendor, rack,
        location_scope, location_site, placement_type, team_name, usage_purpose,
        owner_name, utilization_week_7, utilization_week_8, automation_filter,
        infra_tickets, device_repurpose
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        mac_address, model_name, model_alias, model_type, device_type, vendor, rack,
        location_scope, location_site, placement_type, team_name, usage_purpose,
        owner_name, utilization_week_7, utilization_week_8, automation_filter,
        infra_tickets, device_repurpose
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Device with this MAC address already exists' });
    }
    res.status(500).json({ error: 'Failed to create device' });
  }
};

const updateDevice = async (req, res) => {
  try {
    const { mac } = req.params;
    const fields = req.body;

    const allowedFields = [
      'model_name', 'model_alias', 'model_type', 'device_type', 'vendor', 'rack',
      'location_scope', 'location_site', 'placement_type', 'team_name',
      'usage_purpose', 'owner_name', 'utilization_week_7', 'utilization_week_8',
      'automation_filter', 'infra_tickets', 'device_repurpose'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(fields).forEach(field => {
      if (allowedFields.includes(field)) {
        updates.push(`${field} = $${paramCount}`);
        values.push(fields[field]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(mac);

    const query = `UPDATE devices SET ${updates.join(', ')} WHERE mac_address = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update device' });
  }
};

const deleteDevice = async (req, res) => {
  try {
    const { mac } = req.params;
    const result = await pool.query('DELETE FROM devices WHERE mac_address = $1 RETURNING *', [mac]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete device' });
  }
};

const getStatistics = async (req, res) => {
  try {
    const totalDevices = await pool.query('SELECT COUNT(*) FROM devices');
    const devicesByType = await pool.query(
      'SELECT device_type, COUNT(*) as count FROM devices GROUP BY device_type'
    );
    const devicesByVendor = await pool.query(
      'SELECT vendor, COUNT(*) as count FROM devices GROUP BY vendor ORDER BY count DESC LIMIT 10'
    );
    const devicesByTeam = await pool.query(
      'SELECT team_name, COUNT(*) as count FROM devices WHERE team_name IS NOT NULL GROUP BY team_name ORDER BY count DESC'
    );

    res.json({
      total: parseInt(totalDevices.rows[0].count),
      byType: devicesByType.rows,
      byVendor: devicesByVendor.rows,
      byTeam: devicesByTeam.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

const getFilterOptions = async (req, res) => {
  try {
    const vendors = await pool.query(
      'SELECT DISTINCT vendor FROM devices WHERE vendor IS NOT NULL ORDER BY vendor'
    );
    const teams = await pool.query(
      'SELECT DISTINCT team_name FROM devices WHERE team_name IS NOT NULL ORDER BY team_name'
    );
    const deviceTypes = await pool.query(
      'SELECT DISTINCT device_type FROM devices ORDER BY device_type'
    );

    res.json({
      vendors: vendors.rows.map(r => r.vendor),
      teams: teams.rows.map(r => r.team_name),
      deviceTypes: deviceTypes.rows.map(r => r.device_type)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch filter options' });
  }
};

module.exports = {
  getDevices,
  getDeviceByMac,
  createDevice,
  updateDevice,
  deleteDevice,
  getStatistics,
  getFilterOptions
};
