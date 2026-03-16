const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const dataQualityRoutes = require('./routes/dataQualityRoutes');
const drillDownRoutes = require('./routes/drillDownRoutes');
const csvRoutes = require('./routes/csvRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication routes (must be before other routes)
app.use('/api/auth', authRoutes);

// Other API routes
app.use('/api', deviceRoutes);
app.use('/api', dataQualityRoutes);
app.use('/api', drillDownRoutes);
app.use('/api', csvRoutes);

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
