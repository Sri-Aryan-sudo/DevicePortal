const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');
const { askQuery } = require('../controllers/nlQueryController');

// Per-user rate limiter: 10 queries per minute
const nlRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user.userId.toString(),
  message: { error: 'Too many queries. Please wait a minute before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/nl-query', authenticateToken, nlRateLimiter, askQuery);

module.exports = router;
