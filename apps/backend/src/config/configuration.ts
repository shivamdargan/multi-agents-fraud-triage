export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  environment: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aegis_support',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'aegis-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  throttle: {
    ttl: 60,
    limit: 100,
  },
  
  cache: {
    ttl: 60,
    max: 100,
  },
  
  agents: {
    maxRetries: 2,
    timeoutMs: 1000,
    flowBudgetMs: 5000,
    circuitBreakerThreshold: 3,
    circuitBreakerCooldownMs: 30000,
  },
  
  llm: {
    enabled: process.env.LLM_ENABLED === 'true',
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1000', 10),
  },
  
  storage: {
    artifactsPath: process.env.ARTIFACTS_PATH || './storage/artifacts',
    reportsPath: process.env.REPORTS_PATH || './storage/reports',
    tracesPath: process.env.TRACES_PATH || './storage/traces',
  },
  
  fixtures: {
    path: process.env.FIXTURES_PATH || './fixtures',
  },
});