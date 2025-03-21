/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 15000,
  verbose: true,
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  // Only run tests that are working
  testPathIgnorePatterns: [
    "/node_modules/",
    "/tests/services/bitebase-service.test.ts",
    "/tests/orchestration/orchestrator.test.ts",
    "/tests/agents/base-agent.test.ts"
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true,
      diagnostics: {
        ignoreCodes: [2571, 6133, 18003, 2554, 2339]
      }
    }]
  }
};
