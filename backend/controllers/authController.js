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
      SELECT user_id, ntid, email, password_hash, role, full_name, team_name, is_active
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
        teamName: user.team_name
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
      `SELECT user_id, ntid, email, role, full_name, team_name, is_active 
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
        teamName: user.team_name
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
      `SELECT user_id, ntid, email, role, full_name, team_name, last_login, created_at 
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
        teamName: user.team_name,
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

// Create new user (ADMIN only)
const createUser = async (req, res) => {
  try {
    const { ntid, email, password, role, fullName, teamName } = req.body;

    // Validate required fields
    if (!ntid || !email || !password || !role) {
      return res.status(400).json({ 
        error: 'NTID, email, password, and role are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Validate role
    const validRoles = ['ADMIN', 'POC', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role. Must be ADMIN, POC, or VIEWER' 
      });
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }

    // Check if NTID already exists
    const ntidCheck = await pool.query(
      'SELECT user_id FROM users WHERE LOWER(ntid) = LOWER($1)',
      [ntid]
    );

    if (ntidCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'NTID already exists' 
      });
    }

    // Check if email already exists
    const emailCheck = await pool.query(
      'SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Email already exists' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user
    const insertQuery = `
      INSERT INTO users (ntid, email, password_hash, role, full_name, team_name, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING user_id, ntid, email, role, full_name, team_name, is_active, created_at
    `;

    const result = await pool.query(insertQuery, [
      ntid,
      email,
      passwordHash,
      role,
      fullName || null,
      teamName || null
    ]);

    const newUser = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        userId: newUser.user_id,
        ntid: newUser.ntid,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.full_name,
        teamName: newUser.team_name,
        isActive: newUser.is_active,
        createdAt: newUser.created_at
      }
    });

    console.log(`User ${newUser.ntid} created by ADMIN ${req.user?.ntid || 'unknown'}`);

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      error: 'Failed to create user' 
    });
  }
};

// Get all users (ADMIN only)
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT user_id, ntid, email, role, full_name, team_name, is_active, last_login, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      users: result.rows.map(user => ({
        userId: user.user_id,
        ntid: user.ntid,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        teamName: user.team_name,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }))
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users' 
    });
  }
};

module.exports = {
  login,
  verifyToken,
  logout,
  getCurrentUser,
  createUser,
  getAllUsers
};
