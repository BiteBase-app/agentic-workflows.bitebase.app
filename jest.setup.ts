// Global Jest setup file
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Extend Jest timeout for async tests
jest.setTimeout(20000);

// Global test environment setup
beforeAll(() => {
  // Prevent actual calls to external APIs
  process.env.NODE_ENV = 'test';
  
  // Set default API keys for testing
  if (!process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = 'sk-test-mock-api-key';
  }
  
  if (!process.env.BITEBASE_API_KEY) {
    process.env.BITEBASE_API_KEY = 'bb-test-mock-api-key';
  }
});

// Global mocks for common utilities
jest.mock('./src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

// Clean up after all tests
afterAll(() => {
  jest.clearAllMocks();
}); 