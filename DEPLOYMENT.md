# Device Portal — Linux Deployment Guide

## Prerequisites

| Software    | Version    | Purpose                          |
|-------------|------------|----------------------------------|
| Node.js     | 18 LTS+    | Backend API & build tools        |
| npm         | 9+         | Node package management          |
| Python      | 3.10+      | CSV ingestion service            |
| PostgreSQL  | 14+        | Database                         |
| PM2         | 5+         | Process management (optional)    |
| Nginx       | 1.24+      | Reverse proxy (recommended)      |

---

## 1. Clone & Prepare

```bash
git clone <repo-url> /opt/device-portal
cd /opt/device-portal
```

---

## 2. PostgreSQL Setup

```bash
# Create database
sudo -u postgres psql -c "CREATE DATABASE \"device-inventory\";"

# Run schema migration
sudo -u postgres psql -d "device-inventory" -f backend/migrations/schema.sql
```

---

## 3. Backend Setup

```bash
cd backend

# Install dependencies
npm ci --omit=dev

# Create environment file
cp .env.example .env

# Edit .env — set real values:
#   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
#   JWT_SECRET  (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
#   CORS_ORIGIN (e.g. http://your-domain.com)
nano .env

# Run schema migration via script
npm run migrate

# Seed initial admin user (admin / Admin@1234)
npm run seed
# >>> Change the admin password immediately after first login <<<
```

---

## 4. Python Ingestion Service Setup

```bash
cd ../data-ingestion

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
nano .env   # same DB credentials as backend

deactivate
```

---

## 5. Frontend Build

```bash
cd ../frontend

npm ci

# Create environment file
cp .env.example .env
# Set REACT_APP_API_URL to the backend API URL accessible from the browser
# For same-host deployment behind Nginx: REACT_APP_API_URL=/api
nano .env

# Build production bundle
npm run build
```

The built files will be in `frontend/build/`. The Node backend serves them
automatically when `NODE_ENV=production`.

---

## 6. Start Services

### Option A: PM2 (recommended)

```bash
cd /opt/device-portal

# Install PM2 globally
npm install -g pm2

# Activate Python venv for the ingestion worker
# PM2 will call gunicorn directly so make sure it's on PATH:
export PATH="/opt/device-portal/data-ingestion/venv/bin:$PATH"

# Create logs directory
mkdir -p logs

# Start all services
pm2 start ecosystem.config.js

# Save process list so it survives reboot
pm2 save
pm2 startup   # follow printed instructions to enable on boot
```

### Option B: Manual / systemd

**Backend API:**
```bash
cd /opt/device-portal/backend
NODE_ENV=production node server.js
```

**Ingestion Service:**
```bash
cd /opt/device-portal/data-ingestion
source venv/bin/activate
gunicorn --bind 0.0.0.0:5001 --workers 2 --timeout 120 app:app
```

You can create systemd unit files for each service to start on boot.

---

## 7. Nginx Reverse Proxy (recommended)

Create `/etc/nginx/sites-available/device-portal`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend + backend API on the same origin
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Ingestion service
    location /ingest {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50M;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/device-portal /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

When using Nginx as a reverse proxy, update the frontend `.env` before
building:

```
REACT_APP_API_URL=/api
```

And update the CSVIngestion component's upload URL to use the proxied
`/ingest` path instead of `http://localhost:5001/ingest`.

---

## 8. Environment Variable Reference

### Backend (.env)

| Variable       | Required | Default            | Description                              |
|----------------|----------|--------------------|------------------------------------------|
| DB_HOST        | Yes      | —                  | PostgreSQL host                          |
| DB_PORT        | No       | 5432               | PostgreSQL port                          |
| DB_NAME        | Yes      | —                  | Database name                            |
| DB_USER        | Yes      | —                  | Database user                            |
| DB_PASSWORD    | Yes      | —                  | Database password                        |
| PORT           | No       | 5000               | Backend HTTP port                        |
| NODE_ENV       | No       | development        | `production` or `development`            |
| JWT_SECRET     | Yes      | —                  | Random secret for signing JWTs           |
| JWT_EXPIRES_IN | No       | 8h                 | Token lifetime                           |
| CORS_ORIGIN    | No       | http://localhost:3000 | Comma-separated allowed origins       |
| BCRYPT_ROUNDS  | No       | 12                 | Bcrypt cost factor                       |

### Ingestion Service (.env)

| Variable       | Required | Default            | Description                              |
|----------------|----------|--------------------|------------------------------------------|
| DB_HOST        | No       | localhost          | PostgreSQL host                          |
| DB_PORT        | No       | 5432               | PostgreSQL port                          |
| DB_NAME        | No       | device-inventory   | Database name                            |
| DB_USER        | No       | postgres           | Database user                            |
| DB_PASSWORD    | No       | (empty)            | Database password                        |
| FLASK_PORT     | No       | 5001               | Flask HTTP port                          |
| FLASK_DEBUG    | No       | false              | Enable Flask debug mode                  |
| CORS_ORIGIN    | No       | http://localhost:3000 | Allowed origins                       |

### Frontend (.env)

| Variable                | Required | Default                     |
|-------------------------|----------|-----------------------------|
| REACT_APP_API_URL       | No       | http://localhost:5000/api   |
| REACT_APP_INGESTION_URL | No       | http://localhost:5001/ingest|

---

## 9. Ports Summary

| Service             | Default Port | Configurable Via       |
|---------------------|-------------|------------------------|
| Node.js Backend     | 5000        | `PORT` in backend/.env |
| Flask Ingestion     | 5001        | `FLASK_PORT` in data-ingestion/.env |
| React Dev Server    | 3000        | (dev only)             |
| PostgreSQL          | 5432        | `DB_PORT`              |

---

## 10. User Roles

| Role   | Login Required | View | Edit Devices | Upload CSV | Manage Users |
|--------|---------------|------|-------------|-----------|-------------|
| VIEWER | No            | Yes  | No          | No        | No          |
| POC    | Yes           | Yes  | Yes*        | Yes       | No          |
| ADMIN  | Yes           | Yes  | Yes*        | Yes       | Yes         |

*POC/ADMIN can edit `current_user`, `team_name`, `usage_purpose`,
`placement_type`, `location_site`, `device_repurpose`. They cannot edit
`primary_owner` (set only via CSV ingestion).

---

## Troubleshooting

- **"Missing required environment variable"** — ensure `backend/.env` has all
  required values (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET).
- **CORS errors** — set `CORS_ORIGIN` to match the URL in the browser address bar.
- **Token expired on page refresh** — the token is stored in localStorage/sessionStorage;
  if it expires the user is redirected to login.
- **Database connection refused** — verify PostgreSQL is running and credentials are
  correct. Check `pg_hba.conf` allows connections from the app host.
