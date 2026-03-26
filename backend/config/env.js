const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const required = (name) => {
  const val = process.env[name];
  if (!val) {
    console.error(`FATAL: Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return val;
};

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,

  // Database
  DB_HOST: required('DB_HOST'),
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME: required('DB_NAME'),
  DB_USER: required('DB_USER'),
  DB_PASSWORD: required('DB_PASSWORD'),

  // JWT — no fallback; must be set in environment
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Bcrypt
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
};
