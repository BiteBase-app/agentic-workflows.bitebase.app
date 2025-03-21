import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Utility function to get environment variables with validation
const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
};

// Utility function to get environment number variables with validation
const getEnvAsNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value !== undefined ? parseInt(value, 10) : defaultValue as number;
};

// Utility function to get environment boolean variables
const getEnvAsBoolean = (key: string, defaultValue = false): boolean => {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
};

// Export environment variables as constants
export const config = {
  // Server configuration
  server: {
    port: getEnvAsNumber('PORT', 8080),
    nodeEnv: getEnv('NODE_ENV', 'development'),
    logLevel: getEnv('LOG_LEVEL', 'info'),
  },
  
  // API configuration
  api: {
    version: getEnv('API_VERSION', '1.0.0'),
    enableCors: getEnvAsBoolean('ENABLE_CORS', true),
    requestTimeout: getEnvAsNumber('REQUEST_TIMEOUT', 60000),
  },
  
  // OpenAI configuration
  openai: {
    apiKey: getEnv('OPENAI_API_KEY'),
    model: getEnv('OPENAI_MODEL', 'gpt-4o'),
  },
  
  // Agent configuration
  agent: {
    maxConcurrentAgents: getEnvAsNumber('MAX_CONCURRENT_AGENTS', 5),
    timeout: getEnvAsNumber('AGENT_TIMEOUT', 30000),
    maxRetries: getEnvAsNumber('MAX_RETRIES', 3),
    retryDelay: getEnvAsNumber('RETRY_DELAY', 1000),
  },
  
  // Monitoring configuration
  monitoring: {
    enabled: getEnvAsBoolean('ENABLE_MONITORING', true),
    metricsInterval: getEnvAsNumber('METRICS_INTERVAL', 60000),
  },
  
  // Cache configuration
  cache: {
    enabled: getEnvAsBoolean('CACHE_ENABLED', true),
    ttl: getEnvAsNumber('CACHE_TTL', 3600),
  },
  
  // JWT configuration
  jwt: {
    secret: getEnv('JWT_SECRET'),
    expiry: getEnv('JWT_EXPIRY', '1d'),
  },
}; 