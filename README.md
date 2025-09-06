# Aegis Support - Multi-Agent Banking System

Internal tool for care agents to analyze transactions, generate AI reports, and triage suspected fraud with a multi-agent pipeline.

## Architecture

- **Frontend**: Next.js with TypeScript, shadcn/ui components
- **Backend**: NestJS with TypeScript
- **Database**: PostgreSQL with Redis for caching
- **Infrastructure**: Docker Compose for local development

## Quick Start

```bash
# Install dependencies
npm install

# Start with Docker
docker-compose up

# Or run locally
npm run dev
```

## Project Structure

```
aegis-support/
├── apps/
│   ├── frontend/          # Next.js application
│   └── backend/           # NestJS application
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Shared utilities
│   └── agents/           # Multi-agent system
├── fixtures/             # Test data and fixtures
└── docker-compose.yml    # Docker configuration
```

## Features

- Transaction analysis and insights
- Fraud detection and triage
- Multi-agent workflow with guardrails
- Real-time metrics and observability
- Comprehensive evaluation framework

## Development

```bash
# Run development servers
npm run dev

# Run tests
npm run test

# Lint code
npm run lint

# Build for production
npm run build
```