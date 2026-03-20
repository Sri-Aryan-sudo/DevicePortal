const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, verifyAdmin } = require('../middleware/auth');

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/verify
 * @desc    Verify JWT token validity
 * @access  Private (requires valid token)
 */
router.post('/verify', authenticateToken, authController.verifyToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user's profile
 * @access  Private (requires authentication)
 */
router.get('/me', authenticateToken, authController.getCurrentUser);

/**
 * @route   POST /api/auth/users
 * @desc    Create a new user
 * @access  Private (ADMIN only)
 */
router.post('/users', authenticateToken, verifyAdmin, authController.createUser);

/**
 * @route   GET /api/auth/users
 * @desc    Get all users
 * @access  Private (ADMIN only)
 */
router.get('/users', authenticateToken, verifyAdmin, authController.getAllUsers);

module.exports = router;
