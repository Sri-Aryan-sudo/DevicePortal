const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = '8h'; // Token valid for 8 hours

// Login endpoint
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // ✅ FIXED: correct spelling

    // Validate input
    if (!identifier || !password) {
      return res.status(400).json({ 
        error: 'NTID/Email and password are required' 
      });
    }

    // Find user by NTID or email - ✅ FIXED: using user_id not id
    const userQuery = `
      SELECT user_id, ntid, email, password_hash, role, full_name, department, is_active
      FROM users 
      WHERE (LOWER(ntid) = LOWER($1) OR LOWER(email) = LOWER($1))
      AND is_active = true
    `;
    
    const result = await pool.query(userQuery, [identifier]);

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Update last login timestamp - ✅ FIXED: using user_id
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
      [user.user_id]
    );

    // Generate JWT token - ✅ FIXED: using user_id
    const token = jwt.sign(
      {
        userId: user.user_id,
        ntid: user.ntid,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return success response - ✅ FIXED: using user_id
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        userId: user.user_id,
        ntid: user.ntid,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        department: user.department
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed. Please try again.' 
    });
  }
};

// Verify token endpoint
const verifyToken = async (req, res) => {
  try {
    // Token already verified by middleware, user info in req.user
    const { userId } = req.user;

    // Fetch fresh user data from database - ✅ FIXED: using user_id
    const result = await pool.query(
      `SELECT user_id, ntid, email, role, full_name, department, is_active 
       FROM users 
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'User not found or inactive' 
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        userId: user.user_id,
        ntid: user.ntid,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        department: user.department
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      error: 'Failed to verify token' 
    });
  }
};

// Logout endpoint (optional - mainly for audit logging)
const logout = async (req, res) => {
  try {
    // In JWT, logout is mainly handled client-side by removing the token
    // But we can log it for audit purposes
    const { userId } = req.user;

    console.log(`User ${userId} logged out at ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed' 
    });
  }
};

// Get current user profile
const getCurrentUser = async (req, res) => {
  try {
    const { userId } = req.user;

    // ✅ FIXED: using user_id
    const result = await pool.query(
      `SELECT user_id, ntid, email, role, full_name, department, last_login, created_at 
       FROM users 
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        userId: user.user_id,
        ntid: user.ntid,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        department: user.department,
        lastLogin: user.last_login,
        memberSince: user.created_at
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user profile' 
    });
  }
};

module.exports = {
  login,
  verifyToken,
  logout,
  getCurrentUser
};
