import express from 'express';
import cors from 'cors';
import { config } from './config/environment';
import logger from './utils/logger';
import { AnalysisRequest, AnalysisResponse, AnalysisStatus, ErrorResponse } from './api/models';
import { 
  AgentType, 
  AgentCapability, 
  PriorityLevel, 
  AnalysisType,
  AgentConfig,
  OrchestrationConfig,
  ResultAggregationMethod
} from './config/agent-config';
import { BaseAgent } from './backend/agents/base-agent';
import { SentimentAgent } from './backend/agents/sentiment-agent';
import { AgentOrchestrator } from './orchestration/orchestrator';
import { CustomerSupportWorkflow } from './workflows/workflow';
import path from 'path';
import appModule from './app';
import { DbService } from './services/db-service';
import { BiteBaseService } from './services/bitebase-service';

// Type definitions for Express route handlers
type RouteHandler = (req: express.Request, res: express.Response, next?: express.NextFunction) => void | Promise<any>;

// Create Express application
const app = express();

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS
if (config.api.enableCors) {
  app.use(cors());
}

// Configure request timeout
app.use((req, res, next) => {
  res.setTimeout(config.api.requestTimeout, () => {
    res.status(408).json({
      error: 'Request timeout',
      code: 'REQUEST_TIMEOUT',
    });
  });
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });

  next();
});

// Analysis status storage
const analysisStatus = new Map<string, AnalysisStatus>();

// Initialize agents and orchestrator
const initializeAgents = async () => {
  try {
    logger.info('Initializing agents');

    // Initialize sentiment agent
    const sentimentAgent = new SentimentAgent({
      type: AgentType.SENTIMENT,
      capabilities: [AgentCapability.SENTIMENT_ANALYSIS],
      priority: PriorityLevel.MEDIUM,
      enabled: true,
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 2000,
      contextWindow: 16000,
      memoryEnabled: true,
      usesTools: true,
      timeout: 30000,
      maxRetries: 3
    });
    
    // Create agent map
    const agents = new Map<AgentType, any>();
    agents.set(AgentType.SENTIMENT, sentimentAgent);

    // Initialize orchestrator
    const orchestratorConfig: Partial<OrchestrationConfig> = {
      maxConcurrentAgents: 5,
      agentTimeout: 30000,
      maxRetries: 3,
      resultAggregation: ResultAggregationMethod.SIMPLE,
      cacheEnabled: true,
      cacheTTL: 3600,
      priorityEnabled: true,
      analyzeByDefault: [AnalysisType.SENTIMENT]
    };
    const orchestrator = new AgentOrchestrator(orchestratorConfig);
    orchestrator.registerAgent(sentimentAgent);

    await orchestrator.initialize();

    return orchestrator;
  } catch (error) {
    logger.error('Failed to initialize agents', { error });
    throw error;
  }
};

// Initialize workflows
const initializeWorkflows = () => {
  try {
    const customerSupportWorkflow = new CustomerSupportWorkflow();

    return {
      customerSupport: customerSupportWorkflow,
    };
  } catch (error) {
    logger.error('Failed to initialize workflows', { error });
    throw error;
  }
};

// Start background task for analysis
const runAnalysis = async (
  orchestrator: AgentOrchestrator,
  analysisId: string,
  request: AnalysisRequest
) => {
  try {
    // Update status to processing
    analysisStatus.set(analysisId, {
      status: 'processing',
      progress: 0.1,
      completedTypes: [],
      currentType: request.analysisTypes[0],
    });

    // Run analysis
    const result = await orchestrator.runAnalysis(request);

    // Update status to completed
    analysisStatus.set(analysisId, {
      status: 'completed',
      progress: 1.0,
      completedTypes: request.analysisTypes,
      currentType: null,
      results: result.results,
      executionTime: result.executionTime,
    });

    // Remove status after 1 hour
    setTimeout(() => {
      analysisStatus.delete(analysisId);
    }, 60 * 60 * 1000);

    return result;
  } catch (error: any) {
    // Update status to failed
    analysisStatus.set(analysisId, {
      status: 'failed',
      progress: 0,
      completedTypes: [],
      currentType: null,
      error: error.message,
    });

    logger.error(`Analysis ${analysisId} failed`, { error });

    // Remove status after 1 hour
    setTimeout(() => {
      analysisStatus.delete(analysisId);
    }, 60 * 60 * 1000);

    throw error;
  }
};

// Define routes
const defineRoutes = (orchestrator: AgentOrchestrator, workflows: any) => {
  // Root endpoint
  const rootHandler: RouteHandler = (req, res): void => {
    res.json({
      status: 'online',
      service: 'Agentic Workflow API',
      version: config.api.version,
      endpoints: {
        analyze: '/analyze',
        'analyze/status': '/analyze/status/{analysis_id}',
        workflow: '/workflow/{workflow_name}',
        health: '/health',
      },
    });
  };
  app.get('/', rootHandler);

  // Health check endpoint
  const healthHandler: RouteHandler = (req, res): void => {
    res.json({
      status: 'healthy',
      details: {
        api: 'up',
        service: 'up',
        timestamp: new Date().toISOString(),
        metrics: {
          requests_total: 100, // Placeholder metrics
          success_rate: 99.5,
          avg_response_time: 0.125,
        },
      },
    });
  };
  app.get('/health', healthHandler);

  // Analyze endpoint
  const analyzeHandler: RouteHandler = async (req, res): Promise<void> => {
    try {
      const request = req.body as AnalysisRequest;

      // Generate analysis ID
      const analysisId = `analysis_${Date.now()}_${request.projectId}`;

      // Initialize status
      analysisStatus.set(analysisId, {
        status: 'pending',
        progress: 0.0,
        completedTypes: [],
        currentType: null,
      });

      // Start analysis in background
      if (!request.streaming) {
        // Run in background
        runAnalysis(orchestrator, analysisId, request).catch(error => {
          logger.error(`Background analysis failed for ${analysisId}`, { error });
        });

        // Return immediate response
        res.json({
          success: true,
          restaurantId: request.projectId,
          analysisTypes: request.analysisTypes,
          timestamp: new Date().toISOString(),
          executionTime: 0,
          results: { analysisId },
          metadata: { status: 'processing' },
        } as AnalysisResponse);
        return;
      }

      // For streaming, run synchronously
      const result = await runAnalysis(orchestrator, analysisId, request);

      res.json(result);
    } catch (error: any) {
      logger.error('Analysis request failed', { error });

      res.status(500).json({
        error: error.message,
        code: 'ANALYSIS_FAILED',
        details: {},
      } as ErrorResponse);
    }
  };
  app.post('/analyze', analyzeHandler);

  // Analysis status endpoint
  const analysisStatusHandler: RouteHandler = (req, res): void => {
    const { analysisId } = req.params;

    const status = analysisStatus.get(analysisId);

    if (!status) {
      res.status(404).json({
        error: 'Analysis not found',
        code: 'ANALYSIS_NOT_FOUND',
        details: { analysisId },
      } as ErrorResponse);
      return;
    }

    res.json(status);
  };
  app.get('/analyze/status/:analysisId', analysisStatusHandler);

  // Workflow endpoint
  const workflowHandler: RouteHandler = async (req, res): Promise<void> => {
    try {
      const { workflowName } = req.params;
      const workflow = workflows[camelCase(workflowName)];

      if (!workflow) {
        res.status(404).json({
          error: `Workflow ${workflowName} not found`,
          code: 'WORKFLOW_NOT_FOUND',
          details: { availableWorkflows: Object.keys(workflows).map(snakeCase) },
        } as ErrorResponse);
        return;
      }

      const result = await workflow.execute({
        workflowInput: req.body,
        orchestrator,
        userId: req.headers['x-user-id'] as string,
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Workflow execution failed', { error });

      res.status(500).json({
        error: error.message,
        code: 'WORKFLOW_FAILED',
        details: {},
      } as ErrorResponse);
    }
  };
  app.post('/workflow/:workflowName', workflowHandler);

  // Static files
  app.use('/public', express.static(path.join(__dirname, '../public')));

  // 404 handler
  const notFoundHandler: RouteHandler = (req, res): void => {
    res.status(404).json({
      error: 'Not Found',
      code: 'ENDPOINT_NOT_FOUND',
      details: { path: req.path },
    } as ErrorResponse);
  };
  app.use(notFoundHandler);

  // Error handler
  const errorHandler = (err: Error, req: express.Request, res: express.Response, next: express.NextFunction): void => {
    logger.error('Unhandled error', { error: err });

    res.status(500).json({
      error: 'Internal Server Error',
      code: 'SERVER_ERROR',
      details: { message: err.message },
    } as ErrorResponse);
  };
  app.use(errorHandler);
};

// Utility functions
const camelCase = (str: string): string => {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
};

const snakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
};

// Change the app creation to be a function that accepts services
export function createApp(services?: {
  dbService?: any;
  biteBaseService?: any;
}) {
  const app = express();

  // Configure middleware
  app.use(express.json());
  app.use(cors());

  // Initialize services
  const dbService = services?.dbService || null;
  const biteBaseService = services?.biteBaseService || null;

  // Initialize agent orchestrator
  const sentimentAgent = new SentimentAgent({
    type: AgentType.SENTIMENT,
    capabilities: [AgentCapability.SENTIMENT_ANALYSIS],
    priority: PriorityLevel.MEDIUM,
    enabled: true,
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 2000,
    contextWindow: 16000,
    memoryEnabled: true,
    usesTools: true,
    timeout: 30000,
    maxRetries: 3
  });

  const orchestratorConfig: Partial<OrchestrationConfig> = {
    maxConcurrentAgents: 5,
    agentTimeout: 30000,
    maxRetries: 3,
    resultAggregation: ResultAggregationMethod.SIMPLE,
    cacheEnabled: true,
    cacheTTL: 3600,
    priorityEnabled: true,
    analyzeByDefault: [AnalysisType.SENTIMENT]
  };
  const orchestrator = new AgentOrchestrator(orchestratorConfig);
  orchestrator.registerAgent(sentimentAgent);

  // Initialize workflows
  const customerSupportWorkflow = new CustomerSupportWorkflow();

  // Store instances in app.locals for middleware access
  app.locals.orchestrator = orchestrator;
  app.locals.workflowRegistry = { customerSupport: customerSupportWorkflow };
  app.locals.dbService = dbService;
  app.locals.biteBaseService = biteBaseService;

  // Define routes
  defineRoutes(orchestrator, { customerSupport: customerSupportWorkflow });

  return app;
}

// Only start the server if this file is run directly
if (require.main === module) {
  const app = createApp();
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
