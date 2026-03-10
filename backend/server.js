const express = require('express');
const cors = require('cors');
require('dotenv').config();

const deviceRoutes = require('./routes/deviceRoutes');
const dataQualityRoutes = require('./routes/dataQualityRoutes');
const drillDownRoutes = require('./routes/drillDownRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', deviceRoutes);
app.use('/api', dataQualityRoutes);
app.use('/api', drillDownRoutes);

app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
