# Aegis Support - System Overview

## 🎯 Purpose

Aegis Support is a comprehensive fraud detection and customer support platform designed for financial institutions. It provides real-time transaction monitoring, fraud triage capabilities, customer insights, and automated risk assessment.

## 🏗️ High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Admin[Admin Dashboard]
    end
    
    subgraph "Application Layer"
        Frontend[Next.js Frontend<br/>Port 3000]
        API[NestJS Backend<br/>Port 3001]
    end
    
    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL<br/>Port 5432)]
        Redis[(Redis<br/>Port 6379)]
    end
    
    subgraph "External Services"
        AI[AI Agents<br/>LLM Services]
        Queue[Bull Queue<br/>Background Jobs]
    end
    
    Browser --> Frontend
    Admin --> Frontend
    Frontend --> API
    API --> PostgreSQL
    API --> Redis
    API --> AI
    API --> Queue
    Queue --> Redis
```

## 🔄 Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database
    participant AI
    participant Queue
    
    User->>Frontend: View Transaction
    Frontend->>API: GET /v1/transactions
    API->>Database: Query transactions
    Database-->>API: Transaction data
    API-->>Frontend: JSON response
    Frontend-->>User: Display data
    
    User->>Frontend: Run Fraud Triage
    Frontend->>API: POST /v1/fraud/triage
    API->>Queue: Create triage job
    Queue->>AI: Process with agents
    AI-->>Queue: Analysis results
    Queue->>Database: Store results
    API-->>Frontend: SSE updates
    Frontend-->>User: Real-time progress
```

## 🧩 System Components

### Frontend (Next.js)
- **Purpose**: User interface for fraud analysts and support agents
- **Key Features**:
  - Real-time fraud queue monitoring
  - Transaction analysis dashboard
  - Customer insights and reports
  - Risk assessment visualization

### Backend (NestJS)
- **Purpose**: RESTful API and business logic layer
- **Key Features**:
  - Transaction processing and validation
  - Fraud detection algorithms
  - AI agent orchestration
  - Real-time SSE streaming
  - Background job processing

### Database (PostgreSQL)
- **Purpose**: Primary data storage
- **Stores**:
  - Customer profiles
  - Transaction history
  - Fraud alerts
  - Analysis results
  - Knowledge base articles

### Cache (Redis)
- **Purpose**: Session management and job queuing
- **Uses**:
  - API response caching
  - Bull queue job storage
  - Real-time event streaming
  - Rate limiting

## 🔐 Security Architecture

```mermaid
graph LR
    subgraph "Security Layers"
        WAF[Web Application Firewall]
        RateLimit[Rate Limiting]
        Auth[Authentication]
        RBAC[Role-Based Access]
        Encryption[Data Encryption]
    end
    
    Request[Incoming Request] --> WAF
    WAF --> RateLimit
    RateLimit --> Auth
    Auth --> RBAC
    RBAC --> API[API Endpoint]
    API --> Encryption
    Encryption --> DB[(Database)]
```

## 📊 Key Metrics & Monitoring

### Performance Metrics
- **API Response Time**: < 200ms (p95)
- **Fraud Detection Speed**: < 5s per transaction
- **Dashboard Load Time**: < 2s
- **Real-time Updates**: 5s polling interval

### Business Metrics
- **Alert Accuracy**: Tracked via evaluation system
- **False Positive Rate**: Monitored through feedback
- **Processing Volume**: Transactions per second
- **Agent Response Time**: Time to first action

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        LB[Load Balancer]
        
        subgraph "Application Cluster"
            Frontend1[Frontend Instance 1]
            Frontend2[Frontend Instance 2]
            API1[API Instance 1]
            API2[API Instance 2]
        end
        
        subgraph "Data Cluster"
            PG_Primary[(PostgreSQL Primary)]
            PG_Replica[(PostgreSQL Replica)]
            Redis_Primary[(Redis Primary)]
            Redis_Replica[(Redis Replica)]
        end
    end
    
    LB --> Frontend1
    LB --> Frontend2
    Frontend1 --> API1
    Frontend2 --> API2
    API1 --> PG_Primary
    API2 --> PG_Primary
    PG_Primary --> PG_Replica
    API1 --> Redis_Primary
    Redis_Primary --> Redis_Replica
```

## 🔄 Continuous Integration/Deployment

```mermaid
graph LR
    Dev[Developer] --> Git[Git Push]
    Git --> CI[CI Pipeline]
    CI --> Test[Run Tests]
    Test --> Build[Build Images]
    Build --> Registry[Container Registry]
    Registry --> Deploy[Deploy to K8s]
    Deploy --> Prod[Production]
```

## 📈 Scalability Considerations

### Horizontal Scaling
- **Frontend**: Stateless, can scale with demand
- **Backend**: Stateless API, scales behind load balancer
- **Database**: Read replicas for query distribution
- **Queue**: Redis cluster for job distribution

### Vertical Scaling
- **AI Processing**: GPU instances for LLM operations
- **Database**: High-memory instances for caching
- **Cache**: Memory-optimized Redis instances

## 🎯 Key Use Cases

1. **Real-time Fraud Detection**
   - Monitor incoming transactions
   - Apply ML models for risk scoring
   - Generate alerts for suspicious activity

2. **Customer Support Triage**
   - Analyze customer issues
   - Provide AI-powered recommendations
   - Track resolution metrics

3. **Risk Assessment**
   - Evaluate customer profiles
   - Generate risk reports
   - Monitor spending patterns

4. **Compliance Reporting**
   - Generate regulatory reports
   - Track audit trails
   - Monitor compliance metrics