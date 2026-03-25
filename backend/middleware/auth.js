const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

/**
 * Middleware to verify JWT token and attach user info to request
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch user from database to ensure they're still active
    const result = await pool.query(
      'SELECT user_id, ntid, email, role, full_name, is_active FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }

    const user = result.rows[0];

    // Attach user info to request
    req.user = {
      userId: user.user_id,
      ntid: user.ntid,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to verify user has POC or ADMIN role
 */
const verifyPOCorAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { role } = req.user;
  
  if (role !== 'POC' && role !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'Access denied. POC or ADMIN role required.',
      userRole: role 
    });
  }

  next();
};

/**
 * Middleware to verify user has ADMIN role
 */
const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { role } = req.user;
  
  if (role !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'Access denied. ADMIN role required.',
      userRole: role 
    });
  }

  next();
};

/**
 * Optional middleware - allows access with or without token
 * Useful for endpoints that have different behavior based on authentication
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token provided, continue without user info
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const result = await pool.query(
      'SELECT user_id, ntid, email, role, full_name, is_active FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0 && result.rows[0].is_active) {
      const user = result.rows[0];
      req.user = {
        userId: user.user_id,
        ntid: user.ntid,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      };
    }
  } catch (error) {
    // Invalid or expired token - continue without user info
    console.log('Optional auth: Invalid/expired token');
  }

  next();
};

module.exports = {
  authenticateToken,
  verifyPOCorAdmin,
  verifyAdmin,
  optionalAuth
};
