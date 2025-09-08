# Multi-Agents Fraud Triage System

A comprehensive fraud detection and customer support platform with AI-powered triage capabilities, built with Next.js, NestJS, PostgreSQL, and Redis.

## 🚀 Quick Start with Docker

### Prerequisites
- Docker Desktop installed and running
- Docker Compose (comes with Docker Desktop)
- 8GB RAM minimum recommended
- Ports 3001, 3002, 5432, and 6380 available

### Setup Instructions

1. **Clone the repository**
```bash
git clone https://github.com/your-org/multi-agents-fraud-triage.git
cd multi-agents-fraud-triage
```

2. **Start all services with Docker Compose**
```bash
docker-compose up -d
```

This will:
- Build and start PostgreSQL database (port 5432)
- Build and start Redis cache (port 6380)
- Build and start NestJS backend (port 3001)
- Build and start Next.js frontend (port 3002)
- Run database migrations automatically
- Seed the database with demo data

3. **Wait for services to be ready** (typically 30-60 seconds for first run)
```bash
# Check if all services are running
docker ps

# You should see 4 containers running:
# - aegis-postgres (healthy)
# - aegis-redis (healthy)
# - aegis-backend (running)
# - aegis-frontend (running)
```

4. **Seed the database** (if not done automatically)
```bash
docker exec aegis-backend npx prisma db seed
```

5. **Access the application**
- Frontend: http://localhost:3002
- Backend API: http://localhost:3001/v1
- API Health Check: http://localhost:3001/v1/health

## 🐳 Docker Commands

### Start/Stop Services
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove all data (clean slate)
docker-compose down -v
```

### View Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker logs aegis-backend -f
docker logs aegis-frontend -f
docker logs aegis-postgres -f
docker logs aegis-redis -f
```

### Rebuild Services (after code changes)
```bash
# Rebuild and restart all services
docker-compose up -d --build

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend
```

### Database Management
```bash
# Run migrations
docker exec aegis-backend npx prisma migrate deploy

# Seed database
docker exec aegis-backend npx prisma db seed

# Access database shell
docker exec -it aegis-postgres psql -U postgres -d aegis_support
```

## 🔧 Troubleshooting

### Port Conflicts
If you get port conflict errors, either:
1. Stop conflicting services, or
2. Change ports in `docker-compose.yml`:
   - Frontend: Change `"3002:3000"` to `"YOUR_PORT:3000"`
   - Backend: Change `"3001:3001"` to `"YOUR_PORT:3001"`
   - Update `CORS_ORIGIN` in backend environment to match frontend port
   - Update `NEXT_PUBLIC_API_URL` in frontend environment

### Container Not Starting
```bash
# Check container logs
docker logs aegis-backend

# Recreate container
docker-compose up -d --force-recreate backend
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
docker-compose restart postgres

# Check database logs
docker logs aegis-postgres
```

## 📊 Default Demo Data

After seeding, the system includes:
- 20 Customers with various risk profiles
- 20 Payment Cards
- 20 Transactions (some fraudulent)
- 4 Fraud Alerts ready for triage
- 24 Devices (including suspicious ones)
- 4 Knowledge Base documents

## 🌐 API Endpoints

Key endpoints available at `http://localhost:3001/v1`:
- `GET /health` - Health check
- `GET /customers` - List customers
- `GET /fraud/alerts` - Get fraud alerts
- `GET /fraud/queue` - Get fraud queue
- `POST /fraud/triage` - Run fraud triage
- `GET /dashboard/metrics` - Dashboard metrics

## 🛠️ Development Workflow

### Making Code Changes
1. Edit code in `apps/backend` or `apps/frontend`
2. Rebuild affected services:
```bash
docker-compose build backend  # or frontend
docker-compose up -d
```

### Adding Dependencies
1. Update `package.json` in respective app folder
2. Rebuild the container:
```bash
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Environment Variables
- Backend: Edit environment in `docker-compose.yml` under `backend` service
- Frontend: Edit environment in `docker-compose.yml` under `frontend` service
- Database: Edit environment in `docker-compose.yml` under `postgres` service

## 📚 Documentation

- [System Overview](./docs/OVERVIEW.md) - Architecture diagrams and system design
- [Backend Guide](./docs/BACKEND.md) - API documentation, services, and patterns
- [Frontend Guide](./docs/FRONTEND.md) - Components, hooks, and UI patterns
- [Setup Instructions](./docs/SETUP.md) - Detailed installation guide
- [Architecture Decisions](./docs/ADR.md) - Rationale behind key design choices

## 🏗️ Project Structure

```
multi-agents-fraud-triage/
├── apps/
│   ├── backend/           # NestJS API server
│   │   ├── src/          # Source code
│   │   ├── prisma/       # Database schema & migrations
│   │   └── Dockerfile    # Backend container config
│   └── frontend/         # Next.js web application
│       ├── app/          # App router pages
│       ├── components/   # React components
│       ├── lib/          # Utilities & API client
│       └── Dockerfile    # Frontend container config
├── docs/                 # Project documentation
├── fixtures/             # Demo and test data
│   ├── demo_*.json      # Demo data files
│   └── evals/           # Evaluation test cases
├── docker-compose.yml    # Docker orchestration
└── package.json         # Root package config
```

## 🔧 Technology Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS, shadcn/ui, React Query
- **Backend**: NestJS, Prisma ORM, Bull Queue, Joi validation
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Infrastructure**: Docker, Docker Compose
- **Language**: TypeScript
- **AI**: Multi-agent system for fraud analysis

## 🎯 Key Features

- **Fraud Detection**: Real-time transaction monitoring and risk scoring
- **AI-Powered Triage**: Multi-agent system for intelligent fraud analysis
- **Customer Insights**: Comprehensive customer profiles and spending analytics
- **Risk Assessment**: Device fingerprinting, velocity checks, pattern analysis
- **Knowledge Base**: Integrated documentation for fraud patterns
- **Evaluation System**: Built-in testing for fraud detection accuracy

## 📝 License

[Your License Here]

## 🤝 Contributing

[Contributing Guidelines]

## 📧 Contact

[Contact Information]