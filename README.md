# Agentic Workflow System

A TypeScript-based agentic workflow system for orchestrating AI agents to perform tasks.

## Overview

This project provides a framework for building, orchestrating, and deploying AI agents to work together in a coordinated workflow. It includes:

- Agent foundation with OpenAI integration
- Agent orchestration system
- Workflow management
- REST API with Express
- Background task processing
- Streaming capabilities
- BiteBase integration
- Comprehensive testing suite

## Project Structure

```
.
├── src/
│   ├── agents/         # Agent implementations
│   ├── api/            # API models and validation
│   ├── config/         # Configuration settings
│   ├── db/             # Database models (future expansion)
│   ├── functions/      # Core business logic functions
│   ├── middleware/     # API middleware components
│   ├── monitoring/     # Performance monitoring tools
│   ├── orchestration/  # Agent orchestration system
│   ├── services/       # Service implementations
│   ├── utils/          # Utility functions
│   ├── workflows/      # Workflow definitions
│   └── server.ts       # Express server setup
├── tests/
│   ├── agents/         # Tests for agent implementations
│   ├── api/            # Tests for API endpoints
│   ├── orchestration/  # Tests for agent orchestration
│   ├── services/       # Tests for services
│   ├── workflows/      # Tests for workflow implementations
│   └── jest.setup.ts   # Jest configuration
├── .env                # Environment variables
├── package.json        # Project dependencies
├── jest.config.js      # Jest testing configuration
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## Features

- **Base Agent Framework**: Extensible foundation for creating specialized agents
- **Agent Orchestration**: Coordinate multiple agents to solve complex tasks
- **Workflow Management**: Define, schedule, and run complex workflows
- **REST API**: Express-based API for interacting with the system
- **Sentiment Analysis**: Sample agent for natural language analysis
- **Customer Support Flow**: Sample workflow implementation
- **Asynchronous Processing**: Background task execution
- **Error Handling & Retry Logic**: Robust error handling with automatic retries
- **Database Integration**: Persistent storage with Cloudflare D1
- **BiteBase Integration**: Integration with BiteBase API for data exchange

## Agent Architecture

The agent system follows a modular architecture:

1. **Base Agent**: Abstract class providing core functionality
   - Configuration management
   - Execution lifecycle
   - Error handling and retry logic
   - Type safety

2. **Specialized Agents**: Extend Base Agent
   - `SentimentAgent`: Analyzes text sentiment using OpenAI
   - More agents can be added by implementing the required interfaces

3. **Agent Capabilities**: 
   - Sentiment analysis
   - Entity recognition
   - Summarization
   - Classification
   - Content generation

## Orchestration System

The orchestration system manages agent execution:

1. **Agent Selection**: Based on requested analysis types
2. **Priority Handling**: High-priority agents execute first
3. **Result Aggregation**: Combines results from multiple agents
4. **Parallel Execution**: Runs compatible agents concurrently
5. **Error Recovery**: Handles agent failures without breaking the pipeline

## Database Service

The system uses Cloudflare D1 for data storage:

1. **Workflow Executions**: Records workflow runs and results
2. **Analysis Requests**: Tracks analysis requests and statuses
3. **Agent Executions**: Logs individual agent runs and performance metrics

## BiteBase Integration

Integration with the BiteBase API provides:

1. **Project Management**: Access to BiteBase projects
2. **Bite Operations**: Create, read, update operations on bites
3. **Data Synchronization**: Real-time data exchange

## API Endpoints

### Root Endpoint
- **URL**: `/`
- **Method**: `GET`
- **Description**: Returns basic API information

### Health Check
- **URL**: `/health`
- **Method**: `GET`
- **Description**: Returns API health status and metrics

### Analyze
- **URL**: `/analyze`
- **Method**: `POST`
- **Description**: Executes project analysis using agent orchestration
- **Request Body**:
```json
{
  "projectId": "project-12345",
  "analysisTypes": ["sentiment", "insights"],
  "text": "Text to analyze",
  "streaming": false
}
```

### Analysis Status
- **URL**: `/analyze/status/:analysisId`
- **Method**: `GET`
- **Description**: Checks status of a long-running analysis

### Workflow Execution
- **URL**: `/workflow/:workflowName`
- **Method**: `POST`
- **Description**: Executes a specific workflow
- **Request Body**: Workflow-specific parameters

### BiteBase Integration
- **URL**: `/integration/bitebase`
- **Method**: `GET`
- **Description**: Returns BiteBase integration data

## Testing Strategy

The project includes a comprehensive testing suite using Jest:

### Test Categories

1. **Unit Tests**: Test individual components in isolation
   - Agent functionality
   - Service methods
   - Utility functions

2. **Integration Tests**: Test interaction between components
   - Agent orchestration
   - Workflow execution
   - Database operations

3. **API Tests**: Test HTTP endpoints
   - Request validation
   - Response formatting
   - Status codes
   - Error handling

### Test Structure

Each test file focuses on a specific component:

- **Base Agent Tests**: Verify core agent functionality
- **Sentiment Agent Tests**: Test sentiment analysis capabilities
- **Orchestrator Tests**: Ensure proper agent selection and execution
- **Workflow Tests**: Validate workflow execution and error handling
- **API Tests**: Check endpoint functionality and error responses
- **Service Tests**: Verify database and external API interactions

### Mock Strategy

The tests use Jest mocks to simulate external dependencies:

- **OpenAI API**: Mock responses for AI model calls
- **Database**: Mock query operations
- **BiteBase API**: Mock client responses

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- -t "WorkflowTest" 

# Run specific test file directly with Node
node ./node_modules/jest/bin/jest.js tests/workflows/workflow.test.ts

# Run tests for a specific component
node ./node_modules/jest/bin/jest.js tests/agents
```

### Testing Challenges

When running tests, you may encounter TypeScript errors or test failures due to:

1. **Type Assertions**: The database service handles various data types that may require explicit type assertions.
2. **API Changes**: As the codebase evolves, some tests may need updates to match the current implementation.
3. **Missing Dependencies**: Some tests require mock implementations of external services like OpenAI or BiteBase.

To resolve these issues:

1. Use TypeScript type assertions when necessary: `variable as Type`
2. Update test implementations to match current code structure
3. Ensure all external dependencies are properly mocked

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn
- Cloudflare account (for deployment)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/agentic-workflow-ts.git
cd agentic-workflow-ts
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables by copying `.env.example` to `.env` and setting appropriate values:
```
# Add your OpenAI API key
OPENAI_API_KEY=your-api-key-here

# Add your BiteBase API key
BITEBASE_API_KEY=your-bitebase-key
```

4. Build the project
```bash
npm run build
```

5. Start the server locally
```bash
npm start
```

For development with hot-reloading:
```bash
npm run dev
```

### Cloudflare Deployment

This project can be deployed to Cloudflare Workers, providing a serverless runtime environment with global distribution. 

#### Requirements
- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- Cloudflare D1 database (for data storage)

#### Steps to Deploy

1. Authenticate with Cloudflare (only needed once)
```bash
wrangler login
```

2. Configure your Cloudflare account ID and zone ID in `wrangler.toml` if deploying to a custom domain.

3. Deploy to Cloudflare Workers
```bash
npm run deploy
```

For development testing with Cloudflare Workers:
```bash
npm run wrangler:dev
```

## Development

### Creating a New Agent

1. Create a new file in `src/agents/` directory, e.g., `market-agent.ts`
2. Extend the `BaseAgent` class
3. Implement the required `process` method
4. Register the agent in `server.ts`
5. Create tests in the `tests/agents/` directory

Example:
```typescript
import { BaseAgent } from './base-agent';
import { AgentType, AgentCapability, PriorityLevel } from '../types';

export class MarketAgent extends BaseAgent {
  constructor() {
    super({
      type: AgentType.MARKET,
      capabilities: [AgentCapability.MARKET_ANALYSIS],
      priority: PriorityLevel.MEDIUM,
      enabled: true
    });
  }

  async process(input: any): Promise<any> {
    // Implementation logic
    return {
      market_trend: 'bullish',
      confidence: 0.85,
      insights: 'Market shows positive momentum'
    };
  }
}
```

### Creating a New Workflow

1. Create a new class in `src/workflows/` directory
2. Extend the `Workflow` base class
3. Implement the required `execute` method
4. Register the workflow in `server.ts`
5. Create tests in the `tests/workflows/` directory

### Best Practices

1. **Explicit Types**: Always define TypeScript interfaces for inputs and outputs
2. **Error Handling**: All asynchronous operations should have proper error handling
3. **Test Coverage**: Write tests for new functionality
4. **Documentation**: Document new features and APIs
5. **Performance**: Consider throttling and concurrency limits

## License

[MIT License](LICENSE) 