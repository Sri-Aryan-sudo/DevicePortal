const jwt = require('jsonwebtoken');


// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
  
};

// Middleware to verify user has POC or ADMIN role
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

module.exports = {
  authenticateToken,
  verifyPOCorAdmin
};