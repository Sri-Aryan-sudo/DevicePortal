const pool = require('../config/db');
const multer = require('multer');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv' && ext !== '.xlsx') {
      return cb(new Error('Only CSV and XLSX files are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Parse CSV file
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

// Parse XLSX file
const parseXLSX = (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

// Validate and normalize device data
const validateDevice = (device) => {
  const errors = [];
  
  // Required fields
  if (!device.mac_address) errors.push('mac_address is required');
  if (!device.model_name) errors.push('model_name is required');
  if (!device.model_type) errors.push('model_type is required');
  if (!device.device_type) errors.push('device_type is required');
  if (!device.vendor) errors.push('vendor is required');
  if (!device.team_name) errors.push('team_name is required');
  
  // Validate device_type enum
  if (device.device_type && !['PANEL', 'BOARD', 'STB'].includes(device.device_type.toUpperCase())) {
    errors.push(`device_type must be PANEL, BOARD, or STB (got: ${device.device_type})`);
  }
  
  // Validate MAC address format (basic validation)
  if (device.mac_address && !/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(device.mac_address)) {
    errors.push(`Invalid MAC address format: ${device.mac_address}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Normalize device data (handle case sensitivity, trim, etc.)
const normalizeDevice = (device) => {
  return {
    mac_address: device.mac_address?.trim(),
    model_name: device.model_name?.trim(),
    model_alias: device.model_alias?.trim() || null,
    model_type: device.model_type?.trim(),
    device_type: device.device_type?.toUpperCase().trim(),
    vendor: device.vendor?.trim(),
    rack: device.rack?.trim() || null,
    location_scope: device.location_scope?.trim() || null,
    location_site: device.location_site?.trim() || null,
    placement_type: device.placement_type?.trim() || null,
    team_name: device.team_name?.trim(),
    usage_purpose: device.usage_purpose?.trim() || null,
    primary_owner: device.primary_owner?.trim() || null,
    utilization_week_7: device.utilization_week_7 ? parseFloat(device.utilization_week_7) : null,
    utilization_week_8: device.utilization_week_8 ? parseFloat(device.utilization_week_8) : null,
    automation_filter: device.automation_filter?.trim() || null,
    infra_tickets: device.infra_tickets ? parseInt(device.infra_tickets) : null,
    device_repurpose: device.device_repurpose?.trim() || null
  };
};

// Upload and process CSV/XLSX file
const uploadCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    // Parse file based on extension
    let devices;
    try {
      if (fileExt === '.csv') {
        devices = await parseCSV(filePath);
      } else if (fileExt === '.xlsx') {
        devices = await parseXLSX(filePath);
      } else {
        throw new Error('Unsupported file format');
      }
    } catch (parseError) {
      fs.unlinkSync(filePath); // Clean up file
      return res.status(400).json({ error: 'Failed to parse file', details: parseError.message });
    }

    // Validate all devices
    const validationResults = devices.map((device, index) => ({
      row: index + 2, // +2 because row 1 is header and arrays are 0-indexed
      device: normalizeDevice(device),
      validation: validateDevice(device)
    }));

    const invalidDevices = validationResults.filter(r => !r.validation.valid);
    const validDevices = validationResults.filter(r => r.validation.valid);

    // If validation-only mode, return results without inserting
    if (req.query.validateOnly === 'true') {
      fs.unlinkSync(filePath); // Clean up file
      return res.json({
        success: true,
        totalRows: devices.length,
        validRows: validDevices.length,
        invalidRows: invalidDevices.length,
        invalidDevices: invalidDevices.map(r => ({
          row: r.row,
          errors: r.validation.errors,
          data: r.device
        })),
        message: invalidDevices.length > 0 
          ? `Found ${invalidDevices.length} invalid rows. Fix errors before uploading.`
          : 'All rows are valid. Ready to upload!'
      });
    }

    // Insert valid devices into database
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const insertErrors = [];

    for (const result of validDevices) {
      const device = result.device;
      
      try {
        // Try to insert, on conflict update
        const query = `
          INSERT INTO devices (
            mac_address, model_name, model_alias, model_type, device_type, vendor, rack,
            location_scope, location_site, placement_type, team_name, usage_purpose,
            primary_owner, utilization_week_7, utilization_week_8, automation_filter,
            infra_tickets, device_repurpose
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (mac_address) 
          DO UPDATE SET
            model_name = EXCLUDED.model_name,
            model_alias = EXCLUDED.model_alias,
            model_type = EXCLUDED.model_type,
            device_type = EXCLUDED.device_type,
            vendor = EXCLUDED.vendor,
            rack = EXCLUDED.rack,
            location_scope = EXCLUDED.location_scope,
            location_site = EXCLUDED.location_site,
            placement_type = EXCLUDED.placement_type,
            team_name = EXCLUDED.team_name,
            usage_purpose = EXCLUDED.usage_purpose,
            primary_owner = EXCLUDED.primary_owner,
            utilization_week_7 = EXCLUDED.utilization_week_7,
            utilization_week_8 = EXCLUDED.utilization_week_8,
            automation_filter = EXCLUDED.automation_filter,
            infra_tickets = EXCLUDED.infra_tickets,
            device_repurpose = EXCLUDED.device_repurpose,
            updated_at = CURRENT_TIMESTAMP
          RETURNING (xmax = 0) AS inserted
        `;

        const insertResult = await pool.query(query, [
          device.mac_address, device.model_name, device.model_alias, device.model_type,
          device.device_type, device.vendor, device.rack, device.location_scope,
          device.location_site, device.placement_type, device.team_name, device.usage_purpose,
          device.primary_owner, device.utilization_week_7, device.utilization_week_8,
          device.automation_filter, device.infra_tickets, device.device_repurpose
        ]);

        if (insertResult.rows[0].inserted) {
          insertedCount++;
        } else {
          updatedCount++;
        }
      } catch (dbError) {
        errorCount++;
        insertErrors.push({
          row: result.row,
          mac: device.mac_address,
          error: dbError.message
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Log ingestion
    console.log(`CSV Ingestion by ${req.user?.username || 'POC'}: ${insertedCount} inserted, ${updatedCount} updated, ${errorCount} errors`);

    res.json({
      success: true,
      message: 'CSV processed successfully',
      totalRows: devices.length,
      validRows: validDevices.length,
      invalidRows: invalidDevices.length,
      inserted: insertedCount,
      updated: updatedCount,
      errors: errorCount,
      invalidDevices: invalidDevices.length > 0 ? invalidDevices.slice(0, 10) : undefined, // Show first 10
      insertErrors: insertErrors.length > 0 ? insertErrors.slice(0, 10) : undefined // Show first 10
    });

  } catch (error) {
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('CSV upload error:', error);
    res.status(500).json({ error: 'Failed to process CSV file', details: error.message });
  }
};

module.exports = {
  upload,
  uploadCSV
};
