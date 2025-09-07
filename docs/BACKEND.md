# Backend Documentation - NestJS API

## 🏗️ Backend Architecture

```mermaid
graph TB
    subgraph "NestJS Application"
        subgraph "API Layer"
            Controllers[Controllers]
            Middleware[Middleware]
            Guards[Guards]
            Interceptors[Interceptors]
        end
        
        subgraph "Business Layer"
            Services[Services]
            Agents[AI Agents]
            Processors[Queue Processors]
        end
        
        subgraph "Data Layer"
            Prisma[Prisma ORM]
            Redis[Redis Client]
            Repositories[Repositories]
        end
    end
    
    Client[HTTP Client] --> Middleware
    Middleware --> Guards
    Guards --> Controllers
    Controllers --> Interceptors
    Interceptors --> Services
    Services --> Agents
    Services --> Processors
    Services --> Prisma
    Services --> Redis
    Prisma --> DB[(PostgreSQL)]
    Redis --> Cache[(Redis)]
    Processors --> Queue[(Bull Queue)]
```

## 📦 Module Structure

```mermaid
graph LR
    AppModule[AppModule] --> CommonModule[CommonModule]
    AppModule --> DatabaseModule[DatabaseModule]
    AppModule --> FraudModule[FraudModule]
    AppModule --> CustomersModule[CustomersModule]
    AppModule --> TransactionsModule[TransactionsModule]
    AppModule --> InsightsModule[InsightsModule]
    AppModule --> AgentsModule[AgentsModule]
    AppModule --> ActionsModule[ActionsModule]
    AppModule --> EvalsModule[EvalsModule]
    AppModule --> KnowledgeBaseModule[KnowledgeBaseModule]
    
    FraudModule --> AgentsModule
    InsightsModule --> DatabaseModule
    TransactionsModule --> DatabaseModule
```

## 🔧 Core Services

### 1. Fraud Service
```typescript
// Path: apps/backend/src/modules/fraud/fraud.service.ts
class FraudService {
  // Main fraud detection and triage operations
  runTriage(dto: RunTriageDto)
  getFraudQueue(status?: string)
  getAlert(id: string)
  updateAlert(id: string, data: UpdateAlertDto)
  getRiskSignals(customerId: string)
}
```

### 2. Insights Service
```typescript
// Path: apps/backend/src/modules/insights/insights.service.ts
class InsightsService {
  // Customer insights and reporting
  getSpendInsights(customerId: string, period: string)
  getCategoryInsights(customerId: string)
  getMerchantInsights(customerId: string)
  generateReport(customerId: string, type: string)
  getReports(customerId?: string)
}
```

### 3. Transactions Service
```typescript
// Path: apps/backend/src/modules/transactions/transactions.service.ts
class TransactionsService {
  // Transaction management
  createTransaction(data: CreateTransactionDto)
  getTransactions(filters: TransactionFilters)
  detectAnomalies()
  getTransactionStats()
}
```

### 4. Customers Service
```typescript
// Path: apps/backend/src/modules/customers/customers.service.ts
class CustomersService {
  // Customer profile management
  getCustomers(filters: CustomerFilters)
  getCustomer(id: string)
  getCustomerTransactions(id: string)
  updateRiskLevel(id: string, level: RiskLevel)
}
```

## 🤖 AI Agents Architecture

```mermaid
graph TB
    Orchestrator[Orchestrator Agent] --> Fraud[Fraud Agent]
    Orchestrator --> Compliance[Compliance Agent]
    Orchestrator --> KB[Knowledge Base Agent]
    Orchestrator --> Insights[Insights Agent]
    
    Fraud --> Summarizer[Summarizer Agent]
    Compliance --> Summarizer
    KB --> Summarizer
    Insights --> Summarizer
    
    Summarizer --> Redactor[Redactor Agent]
    Redactor --> Output[Final Output]
```

### Agent Registry
```typescript
// Path: apps/backend/src/agents/agent.registry.ts
const AGENT_REGISTRY = {
  orchestrator: OrchestratorAgent,
  fraud: FraudAgent,
  compliance: ComplianceAgent,
  kb: KnowledgeBaseAgent,
  insights: InsightsAgent,
  summarizer: SummarizerAgent,
  redactor: RedactorAgent
}
```

## 🔄 Queue Processing

```mermaid
sequenceDiagram
    participant API
    participant Bull
    participant Redis
    participant Processor
    participant Agent
    
    API->>Bull: Add job
    Bull->>Redis: Store job
    Processor->>Redis: Poll for jobs
    Redis-->>Processor: Return job
    Processor->>Agent: Process
    Agent-->>Processor: Result
    Processor->>Redis: Update status
    Processor-->>API: Emit event
```

### Queue Processors
- **FraudProcessor**: Handles fraud triage jobs
- **ReportProcessor**: Generates async reports
- **NotificationProcessor**: Sends alerts

## 🔐 Security Implementation

### Authentication & Authorization
```typescript
// Guards
@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@Roles('admin', 'analyst')
```

### Rate Limiting
```typescript
// Applied globally
@UseGuards(ThrottlerGuard)
@Throttle(100, 60) // 100 requests per minute
```

### Data Validation
```typescript
// DTOs with class-validator
class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;
  
  @IsNumber()
  @Min(0)
  amount: number;
}
```

## 📊 Database Schema

```mermaid
erDiagram
    Customer ||--o{ Transaction : has
    Customer ||--o{ Card : owns
    Customer ||--o{ Alert : triggers
    Transaction ||--|| Card : uses
    Transaction ||--o| Alert : generates
    Alert ||--o{ AlertTrace : contains
    Customer ||--o{ Report : generates
    
    Customer {
        string id PK
        string name
        string email
        string riskLevel
        json metadata
    }
    
    Transaction {
        string id PK
        string customerId FK
        string cardId FK
        decimal amount
        string merchant
        datetime timestamp
    }
    
    Alert {
        string id PK
        string customerId FK
        string transactionId FK
        string status
        json triageData
        datetime createdAt
    }
```

## 🚀 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Fraud Module** |
| POST | `/v1/fraud/triage` | Run fraud triage analysis |
| GET | `/v1/fraud/alerts` | Get fraud alerts queue |
| GET | `/v1/fraud/alerts/:id` | Get specific alert |
| PUT | `/v1/fraud/alerts/:id` | Update alert status |
| GET | `/v1/fraud/queue` | Get fraud queue |
| **Customers Module** |
| GET | `/v1/customers` | List all customers |
| GET | `/v1/customers/:id` | Get customer details |
| GET | `/v1/customers/:id/transactions` | Get customer transactions |
| PATCH | `/v1/customers/:id/risk-level` | Update risk level |
| **Transactions Module** |
| GET | `/v1/transactions` | List transactions |
| POST | `/v1/transactions` | Create transaction |
| GET | `/v1/transactions/anomalies/detect` | Detect anomalies |
| GET | `/v1/transactions/stats/summary` | Get statistics |
| **Insights Module** |
| GET | `/v1/insights/spend/:customerId` | Get spend insights |
| GET | `/v1/insights/categories/:customerId` | Category breakdown |
| POST | `/v1/insights/reports/generate` | Generate report |
| GET | `/v1/insights/reports` | List reports |

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/aegis"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API
PORT=3001
API_VERSION=v1

# Security
JWT_SECRET=your-secret-key
RATE_LIMIT=100

# AI Services
LLM_API_KEY=your-api-key
LLM_MODEL=gpt-4
```

### Prisma Configuration
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

## 🧪 Testing Strategy

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## 📈 Performance Optimization

### Database Optimization
- **Indexes**: Created on frequently queried fields
- **Connection Pooling**: Managed by Prisma
- **Query Optimization**: Using selective includes

### Caching Strategy
- **Redis Caching**: For frequently accessed data
- **Response Caching**: For static endpoints
- **Query Result Caching**: For expensive operations

### Async Processing
- **Bull Queues**: For background jobs
- **SSE Streaming**: For real-time updates
- **Batch Processing**: For bulk operations

## 🔄 Development Workflow

```bash
# Start development server
npm run dev

# Run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Seed database
npm run seed

# Build for production
npm run build

# Start production server
npm run start:prod
```