# Setup Guide - Aegis Support

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20.0.0 or higher)
- **npm** (v10.0.0 or higher)
- **PostgreSQL** (v15 or higher)
- **Redis** (v7.0 or higher)
- **Docker & Docker Compose** (optional, for containerized setup)
- **Git**

## 🚀 Quick Start (Docker)

The fastest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/your-org/aegis-support.git
cd aegis-support

# Copy environment files
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend npm run prisma:migrate

# Seed the database
docker-compose exec backend npm run seed

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

## 🛠️ Manual Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/aegis-support.git
cd aegis-support
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm run install:all
```

### Step 3: Database Setup

#### PostgreSQL Setup

```bash
# macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database
createdb aegis_support

# Or using psql
psql -U postgres
CREATE DATABASE aegis_support;
\q
```

#### Redis Setup

```bash
# macOS (using Homebrew)
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### Step 4: Environment Configuration

#### Backend Environment (.env)

```bash
cd apps/backend
cp .env.example .env
```

Edit `apps/backend/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/aegis_support"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3001
NODE_ENV=development

# API
API_VERSION=v1
API_PREFIX=/v1

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# AI/LLM Configuration (Optional)
LLM_API_KEY=your-api-key
LLM_MODEL=gpt-4
LLM_TEMPERATURE=0.7

# Logging
LOG_LEVEL=debug
```

#### Frontend Environment (.env.local)

```bash
cd apps/frontend
cp .env.example .env.local
```

Edit `apps/frontend/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/v1

# App Configuration
NEXT_PUBLIC_APP_NAME=Aegis Support
NEXT_PUBLIC_APP_ENV=development

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=true
```

### Step 5: Database Migration & Seeding

```bash
cd apps/backend

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed the database with demo data
npm run seed

# Verify database setup
npm run prisma:studio
# Opens Prisma Studio at http://localhost:5555
```

### Step 6: Start Development Servers

#### Option 1: Start All Services (Recommended)

```bash
# From root directory
npm run dev

# This starts:
# - Backend: http://localhost:3001
# - Frontend: http://localhost:3000
```

#### Option 2: Start Services Individually

```bash
# Terminal 1: Start Backend
cd apps/backend
npm run dev

# Terminal 2: Start Frontend
cd apps/frontend
npm run dev
```

## 🔧 Development Commands

### Root Level Commands

```bash
# Install all dependencies
npm install

# Start all services
npm run dev

# Build all services
npm run build

# Run tests
npm run test

# Lint all code
npm run lint

# Format code
npm run format
```

### Backend Commands

```bash
cd apps/backend

# Development
npm run dev              # Start dev server with hot reload
npm run start:debug      # Start with debug mode

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:reset     # Reset database
npm run seed            # Seed database

# Testing
npm run test            # Run all tests
npm run test:unit       # Run unit tests
npm run test:e2e        # Run e2e tests
npm run test:cov        # Run tests with coverage

# Build & Production
npm run build           # Build for production
npm run start:prod      # Start production server

# Utilities
npm run lint            # Run ESLint
npm run format          # Format with Prettier
```

### Frontend Commands

```bash
cd apps/frontend

# Development
npm run dev             # Start dev server
npm run turbo           # Start with Turbopack

# Build & Production
npm run build          # Build for production
npm run start          # Start production server

# Testing
npm run test           # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage

# Utilities
npm run lint           # Run ESLint
npm run type-check     # Check TypeScript
npm run analyze        # Analyze bundle size
```

## 🐳 Docker Setup

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: aegis_support
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./apps/backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/aegis_support
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./apps/frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3001/v1
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

### Docker Commands

```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Execute commands in container
docker-compose exec backend npm run prisma:migrate
docker-compose exec backend npm run seed

# Reset everything
docker-compose down -v
```

## 🔍 Verification Steps

### 1. Check Backend Health

```bash
# Health check
curl http://localhost:3001/health

# API version
curl http://localhost:3001/v1

# Swagger docs
open http://localhost:3001/api
```

### 2. Check Database Connection

```bash
# Connect to PostgreSQL
psql -U postgres -d aegis_support

# List tables
\dt

# Check data
SELECT COUNT(*) FROM "Customer";
SELECT COUNT(*) FROM "Transaction";
```

### 3. Check Redis Connection

```bash
# Connect to Redis
redis-cli

# Check keys
KEYS *

# Check Bull queues
KEYS bull:*
```

### 4. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api
- **Prisma Studio**: http://localhost:5555 (when running)

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # or :3001

# Kill process
kill -9 <PID>
```

#### Database Connection Failed

```bash
# Check PostgreSQL status
pg_isready

# Check connection string
psql "postgresql://postgres:password@localhost:5432/aegis_support"

# Reset database
cd apps/backend
npm run prisma:reset
```

#### Redis Connection Failed

```bash
# Check Redis status
redis-cli ping

# Restart Redis
# macOS
brew services restart redis

# Linux
sudo systemctl restart redis
```

#### Node Version Issues

```bash
# Check Node version
node --version

# Use nvm to switch versions
nvm install 20
nvm use 20
```

#### Permission Issues

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Clear npm cache
npm cache clean --force
```

## 📦 Production Deployment

### Build for Production

```bash
# Build all services
npm run build

# Build individually
cd apps/backend && npm run build
cd apps/frontend && npm run build
```

### Environment Variables for Production

```env
# Backend Production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/aegis
REDIS_HOST=prod-redis
JWT_SECRET=production-secret-key
RATE_LIMIT_MAX=50

# Frontend Production
NEXT_PUBLIC_API_URL=https://api.aegis-support.com/v1
NEXT_PUBLIC_APP_ENV=production
```

### Start Production Servers

```bash
# Backend
cd apps/backend
npm run start:prod

# Frontend
cd apps/frontend
npm run start
```

## 🔐 Security Checklist

- [ ] Change default database passwords
- [ ] Generate strong JWT secret
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Implement proper logging
- [ ] Set up monitoring/alerting
- [ ] Regular dependency updates
- [ ] Database backups configured