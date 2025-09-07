# Aegis Support Documentation

## 📚 Table of Contents

- [Project Overview](./OVERVIEW.md) - System architecture and high-level design
- [Backend Documentation](./BACKEND.md) - NestJS backend services and APIs
- [Frontend Documentation](./FRONTEND.md) - Next.js frontend components and features
- [Setup Guide](./SETUP.md) - Installation and configuration instructions
- [Architecture Decision Record](./ADR.md) - Key architectural decisions and rationale

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Or start services individually
npm run dev:backend  # Backend on port 3001
npm run dev:frontend # Frontend on port 3000
```

## 🏗️ Project Structure

```
aegis-support/
├── apps/
│   ├── backend/    # NestJS API server
│   └── frontend/   # Next.js web application
├── docs/           # Project documentation
├── fixtures/       # Demo and test data
└── packages/       # Shared packages (if any)
```

## 🔧 Key Technologies

- **Backend**: NestJS, Prisma, PostgreSQL, Redis, Bull Queue
- **Frontend**: Next.js 15, React 19, TailwindCSS, React Query
- **Infrastructure**: Docker, Docker Compose
- **Development**: TypeScript, Turbo

## 📖 Documentation Index

1. **[System Overview](./OVERVIEW.md)**: Architecture diagrams and system design
2. **[Backend Guide](./BACKEND.md)**: API documentation, services, and patterns
3. **[Frontend Guide](./FRONTEND.md)**: Components, hooks, and UI patterns
4. **[Setup Instructions](./SETUP.md)**: Step-by-step installation guide
5. **[Architecture Decisions](./ADR.md)**: Rationale behind key design choices