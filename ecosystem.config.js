// PM2 ecosystem configuration for Device Portal
// Start all services:  pm2 start ecosystem.config.js
// Stop all:            pm2 stop all
// Logs:                pm2 logs

module.exports = {
  apps: [
    {
      name: 'device-portal-api',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      // PM2 reads .env automatically via dotenv inside the app
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
    },
    {
      name: 'device-portal-ingestion',
      cwd: './data-ingestion',
      script: 'gunicorn',
      args: '--bind 0.0.0.0:5001 --workers 2 --timeout 120 app:app',
      interpreter: 'none',
      env: {
        FLASK_DEBUG: 'false',
      },
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/ingestion-error.log',
      out_file: './logs/ingestion-out.log',
      merge_logs: true,
    },
  ],
};
