const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticateToken, verifyAdmin } = require('../middleware/auth');
const { askQuery, refreshCache } = require('../controllers/nlQueryController');

// Per-user rate limiter — generous since processing is offline and fast
const nlRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user.userId.toString(),
  message: { error: 'Too many queries. Please wait a minute before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/nl-query', authenticateToken, nlRateLimiter, askQuery);
router.post('/nl-query/refresh-cache', authenticateToken, verifyAdmin, refreshCache);

module.exports = router;


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
