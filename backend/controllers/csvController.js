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

// Detect delimiter by reading the first line of the file
const detectDelimiter = (filePath) => {
  const firstChunk = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
  // Strip BOM if present
  const clean = firstChunk.replace(/^\ufeff/, '');
  const firstLine = clean.split(/\r?\n/)[0];
  
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;

  if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
  if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
  return ',';
};

// Strip BOM from file before parsing
const stripBOM = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    fs.writeFileSync(filePath, content.slice(1), 'utf8');
  }
};

// Parse CSV file
const parseCSV = (filePath) => {
  stripBOM(filePath);
  const separator = detectDelimiter(filePath);
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv({ separator }))
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

// Column mapping: CSV human-readable headers → DB column names
const COLUMN_MAPPING = {
  'mac': 'mac_address',
  'mac address': 'mac_address',
  'mac_address': 'mac_address',
  'model': 'model_name',
  'model name': 'model_name',
  'model_name': 'model_name',
  'model alias': 'model_alias',
  'model_alias': 'model_alias',
  'model type': 'model_type',
  'model_type': 'model_type',
  'device classification': 'device_type',
  'device type': 'device_type',
  'device_type': 'device_type',
  'mcats/ cats': 'cats_type',
  'cats type': 'cats_type',
  'cats_type': 'cats_type',
  'vendor': 'vendor',
  'rack': 'rack',
  'location': 'location_scope',
  'location scope': 'location_scope',
  'location_scope': 'location_scope',
  'location site': 'location_site',
  'location_site': 'location_site',
  'placement type': 'placement_type',
  'placement_type': 'placement_type',
  'team name': 'team_name',
  'team_name': 'team_name',
  'used for': 'usage_purpose',
  'used_for': 'usage_purpose',
  'usage purpose': 'usage_purpose',
  'usage_purpose': 'usage_purpose',
  'device owner (primary)': 'primary_owner',
  'primary owner': 'primary_owner',
  'primary_owner': 'primary_owner',
  'automatics filter name': 'automation_filter',
  'automation filter': 'automation_filter',
  'automation_filter': 'automation_filter',
  'infra tickets': 'infra_tickets',
  'infra_tickets': 'infra_tickets',
  'device repurpose': 'device_repurpose',
  'device_repurpose': 'device_repurpose',
};

// Map a raw CSV row to DB column names
const mapColumns = (rawDevice) => {
  const mapped = {};
  for (const [key, value] of Object.entries(rawDevice)) {
    const normalizedKey = key.trim().toLowerCase();
    const dbCol = COLUMN_MAPPING[normalizedKey];
    if (dbCol) {
      mapped[dbCol] = typeof value === 'string' ? value.trim() : value;
    }
  }
  return mapped;
};

// Extract vendor from model_type (matches Python logic)
const extractVendor = (modelType) => {
  if (!modelType) return null;
  const text = modelType.trim();
  if (text.includes('_')) return text.split('_')[0].toUpperCase();
  if (text.includes('-')) return text.split('-')[0].toUpperCase();
  return text.toUpperCase();
};

// Determine device type from model fields (matches Python logic)
const determineDeviceType = (device) => {
  const fields = [device.model_type, device.model_name, device.model_alias];
  for (const field of fields) {
    if (field) {
      const upper = String(field).toUpperCase();
      if (upper.includes('BOARD')) return 'BOARD';
      if (upper.includes('PANEL')) return 'PANEL';
    }
  }
  return 'STB';
};

// Validate and normalize device data
const validateDevice = (device) => {
  const errors = [];
  
  // Required: only mac_address is truly required; others auto-derived if possible
  if (!device.mac_address) errors.push('mac_address is required');
  
  // Validate MAC address format (accept XX:XX:XX:XX:XX:XX, XX-XX-XX-XX-XX-XX, or XXXXXXXXXXXX)
  if (device.mac_address) {
    const mac = device.mac_address.trim();
    const colonFormat = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
    const dashFormat = /^([0-9A-Fa-f]{2}-){5}[0-9A-Fa-f]{2}$/;
    const bareFormat = /^[0-9A-Fa-f]{12}$/;
    
    if (!colonFormat.test(mac) && !dashFormat.test(mac) && !bareFormat.test(mac)) {
      errors.push(`Invalid MAC address format: ${device.mac_address}`);
    }
  }
  
  // Validate device_type enum if provided
  if (device.device_type && !['PANEL', 'BOARD', 'STB'].includes(device.device_type.toUpperCase())) {
    errors.push(`device_type must be PANEL, BOARD, or STB (got: ${device.device_type})`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Normalize MAC address to XX:XX:XX:XX:XX:XX format
const normalizeMac = (mac) => {
  if (!mac) return mac;
  let clean = mac.trim().replace(/[-:]/g, '').toUpperCase();
  if (clean.length === 12 && /^[0-9A-F]{12}$/.test(clean)) {
    return clean.match(/.{2}/g).join(':');
  }
  return mac.trim(); // return as-is if can't normalize
};

// Normalize device data (handle case sensitivity, trim, auto-derive fields)
const normalizeDevice = (device) => {
  const normalized = {
    mac_address: normalizeMac(device.mac_address),
    model_name: device.model_name?.trim() || null,
    model_alias: device.model_alias?.trim() || null,
    model_type: device.model_type?.trim() || null,
    device_type: device.device_type?.toUpperCase().trim() || null,
    cats_type: device.cats_type?.trim() || null,
    vendor: device.vendor?.trim() || null,
    rack: device.rack?.trim() || null,
    location_scope: device.location_scope?.trim() || null,
    location_site: device.location_site?.trim() || null,
    placement_type: device.placement_type?.trim() || null,
    team_name: device.team_name?.trim() || null,
    usage_purpose: device.usage_purpose?.trim() || null,
    primary_owner: device.primary_owner?.trim() || null,
    utilization_week_7: device.utilization_week_7 ? parseFloat(device.utilization_week_7) : null,
    utilization_week_8: device.utilization_week_8 ? parseFloat(device.utilization_week_8) : null,
    automation_filter: device.automation_filter?.trim() || null,
    infra_tickets: device.infra_tickets ? parseInt(device.infra_tickets) : null,
    device_repurpose: device.device_repurpose?.trim() || null
  };

  // Auto-derive vendor from model_type if not provided
  if (!normalized.vendor && normalized.model_type) {
    normalized.vendor = extractVendor(normalized.model_type);
  }

  // Auto-derive device_type from model fields if not provided
  if (!normalized.device_type) {
    normalized.device_type = determineDeviceType(normalized);
  }

  return normalized;
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
      return res.status(400).json({ error: 'Failed to parse file. Ensure the file is a valid CSV or XLSX.' });
    }

    // --- Header recognition check ---
    if (devices.length > 0) {
      const fileHeaders = Object.keys(devices[0]);
      const recognizedHeaders = fileHeaders.filter(h => COLUMN_MAPPING[h.trim().toLowerCase()]);
      const unrecognizedHeaders = fileHeaders.filter(h => !COLUMN_MAPPING[h.trim().toLowerCase()]);
      const hasMacColumn = recognizedHeaders.some(h => COLUMN_MAPPING[h.trim().toLowerCase()] === 'mac_address');

      if (recognizedHeaders.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({
          error: 'No recognizable column headers found in the uploaded file.',
          details: `The file headers [${fileHeaders.slice(0, 10).join(', ')}] do not match any expected column names.`,
          expectedColumns: Object.keys(COLUMN_MAPPING).slice(0, 15),
          hint: 'Ensure the first row contains column headers like "MAC", "Model", "Team Name", etc.'
        });
      }

      if (!hasMacColumn) {
        fs.unlinkSync(filePath);
        return res.status(400).json({
          error: 'Required column "MAC" (mac_address) not found in the uploaded file.',
          recognizedColumns: recognizedHeaders,
          unrecognizedColumns: unrecognizedHeaders,
          hint: 'The file must contain a MAC address column (e.g., "MAC" or "mac_address").'
        });
      }

      // Attach column recognition info to include in response later
      req._columnInfo = {
        recognized: recognizedHeaders.map(h => COLUMN_MAPPING[h.trim().toLowerCase()]),
        unrecognized: unrecognizedHeaders,
        totalHeaders: fileHeaders.length
      };
    }

    // Map raw CSV columns to DB column names, then normalize and validate
    const validationResults = devices.map((rawDevice, index) => {
      const mapped = mapColumns(rawDevice);
      const normalized = normalizeDevice(mapped);
      return {
        row: index + 2, // +2 because row 1 is header and arrays are 0-indexed
        device: normalized,
        validation: validateDevice(mapped)
      };
    });

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
        columnInfo: req._columnInfo || null,
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
            mac_address, model_name, model_alias, model_type, device_type, cats_type, vendor, rack,
            location_scope, location_site, placement_type, team_name, usage_purpose,
            primary_owner, utilization_week_7, utilization_week_8, automation_filter,
            infra_tickets, device_repurpose
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (mac_address) 
          DO UPDATE SET
            model_name = EXCLUDED.model_name,
            model_alias = EXCLUDED.model_alias,
            model_type = EXCLUDED.model_type,
            device_type = EXCLUDED.device_type,
            cats_type = EXCLUDED.cats_type,
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
          device.device_type, device.cats_type, device.vendor, device.rack, device.location_scope,
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

    console.log(`CSV upload complete: ${devices.length} total, ${validDevices.length} valid, ${invalidDevices.length} invalid, ${insertedCount} inserted, ${updatedCount} updated, ${errorCount} errors`);

    res.json({
      success: true,
      message: 'CSV processed successfully',
      totalRows: devices.length,
      validRows: validDevices.length,
      invalidRows: invalidDevices.length,
      inserted: insertedCount,
      updated: updatedCount,
      errors: errorCount,
      columnInfo: req._columnInfo || null,
      invalidDevices: invalidDevices.length > 0 ? invalidDevices.slice(0, 10) : undefined, // Show first 10
      insertErrors: insertErrors.length > 0 ? insertErrors.slice(0, 10) : undefined // Show first 10
    });

  } catch (error) {
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('CSV upload error:', error.message);
    res.status(500).json({ error: 'Failed to process CSV file' });
  }
};

module.exports = {
  upload,
  uploadCSV
};
