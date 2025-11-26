# FleetPro Management System - Deployment Guide

Complete deployment guide for the full-stack FleetPro Management System.

## Architecture

- **Frontend**: Next.js (React) - Port 3000
- **Backend**: FastAPI (Python) - Port 8000
- **Database**: PostgreSQL - Port 5432
- **WebSocket**: Integrated with FastAPI

## Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.11+
- PostgreSQL 14+
- Git

## Local Development Setup

### 1. Clone Repository

\`\`\`bash
git clone <repository-url>
cd fleetpro-management
\`\`\`

### 2. Setup Database

\`\`\`bash
# Create database
createdb fleetpro

# Run migrations
psql -d fleetpro -f scripts/01_create_tables.sql
psql -d fleetpro -f scripts/02_seed_data.sql
\`\`\`

### 3. Setup Backend

\`\`\`bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
\`\`\`

Backend will be available at: http://localhost:8000

### 4. Setup Frontend

\`\`\`bash
# From project root
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local if needed

# Run development server
npm run dev
\`\`\`

Frontend will be available at: http://localhost:3000

## Production Deployment

### Option 1: Docker Deployment (Recommended)

Create `docker-compose.yml`:

\`\`\`yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: fleetpro
      POSTGRES_USER: fleetpro_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+asyncpg://fleetpro_user:secure_password@postgres:5432/fleetpro
      SECRET_KEY: your-production-secret-key
    ports:
      - "8000:8000"
    depends_on:
      - postgres

  frontend:
    build: .
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8000/api
      NEXT_PUBLIC_WS_URL: ws://backend:8000/ws
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
\`\`\`

Deploy:

\`\`\`bash
docker-compose up -d
\`\`\`

### Option 2: Vercel + Railway

#### Deploy Backend to Railway

1. Create account at railway.app
2. Create new project
3. Add PostgreSQL database
4. Deploy backend from GitHub
5. Set environment variables
6. Note the backend URL

#### Deploy Frontend to Vercel

1. Push code to GitHub
2. Import project to Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL`: Your Railway backend URL
   - `NEXT_PUBLIC_WS_URL`: Your Railway WebSocket URL
4. Deploy

### Option 3: VPS Deployment

#### Setup Server (Ubuntu 22.04)

\`\`\`bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.11 python3-pip postgresql nginx nodejs npm

# Install PM2 for process management
sudo npm install -g pm2

# Setup PostgreSQL
sudo -u postgres createuser fleetpro_user
sudo -u postgres createdb fleetpro
sudo -u postgres psql -c "ALTER USER fleetpro_user WITH PASSWORD 'secure_password';"

# Run database migrations
psql -U fleetpro_user -d fleetpro -f scripts/01_create_tables.sql
psql -U fleetpro_user -d fleetpro -f scripts/02_seed_data.sql
\`\`\`

#### Deploy Backend

\`\`\`bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create systemd service
sudo nano /etc/systemd/system/fleetpro-backend.service
\`\`\`

Add:

\`\`\`ini
[Unit]
Description=FleetPro Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/fleetpro/backend
Environment="PATH=/var/www/fleetpro/backend/venv/bin"
ExecStart=/var/www/fleetpro/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`bash
sudo systemctl enable fleetpro-backend
sudo systemctl start fleetpro-backend
\`\`\`

#### Deploy Frontend

\`\`\`bash
npm install
npm run build

# Use PM2
pm2 start npm --name "fleetpro-frontend" -- start
pm2 save
pm2 startup
\`\`\`

#### Configure Nginx

\`\`\`bash
sudo nano /etc/nginx/sites-available/fleetpro
\`\`\`

Add:

\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
\`\`\`

\`\`\`bash
sudo ln -s /etc/nginx/sites-available/fleetpro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
\`\`\`

## Environment Variables

### Backend (.env)

\`\`\`env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/fleetpro
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
\`\`\`

### Frontend (.env.local)

\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
\`\`\`

## Testing

### Backend Tests

\`\`\`bash
cd backend
pytest
\`\`\`

### Frontend Tests

\`\`\`bash
npm test
\`\`\`

## Monitoring

- Backend health: http://your-domain.com/health
- API docs: http://your-domain.com/docs
- Frontend: http://your-domain.com

## Backup

### Database Backup

\`\`\`bash
pg_dump -U fleetpro_user fleetpro > backup_$(date +%Y%m%d).sql
\`\`\`

### Restore

\`\`\`bash
psql -U fleetpro_user fleetpro < backup_20250110.sql
\`\`\`

## Security Checklist

- [ ] Change default SECRET_KEY
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable database connection pooling
- [ ] Set up monitoring and logging

## Support

For issues or questions, contact: support@fleetpro.com
