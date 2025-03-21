import express from 'express';
import cors from 'cors';
import { config } from './config/environment';
import logger from './utils/logger';
import { AnalysisRequest, AnalysisResponse, AnalysisStatus, ErrorResponse } from './api/models';
import path from 'path';
import { DbService } from './services/db-service';

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

// DB Service initialization middleware
app.use((req, res, next) => {
  // Initialize DB service if we have a D1 database connection
  if (req.app.locals.db && !req.app.locals.dbService) {
    req.app.locals.dbService = new DbService(req.app.locals.db);
    logger.info('DB Service initialized with D1 database');
  }
  next();
});

// Analysis status storage
const analysisStatus = new Map<string, AnalysisStatus>();

// Start background task for analysis
const runAnalysis = async (
  orchestrator: any,
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
      'integration/bitebase': '/integration/bitebase',
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
    const orchestrator = req.app.locals.orchestrator;
    const dbService = req.app.locals.dbService;
    
    if (!orchestrator) {
      throw new Error('Orchestrator not initialized');
    }
    
    // Generate analysis ID
    const analysisId = `analysis_${Date.now()}_${request.projectId}`;
    
    // Initialize status
    analysisStatus.set(analysisId, {
      status: 'pending',
      progress: 0.0,
      completedTypes: [],
      currentType: null,
    });
    
    // Record analysis request in database if available
    if (dbService) {
      await dbService.recordAnalysisRequest(
        analysisId,
        request.projectId,
        'pending',
        request.analysisTypes,
        request
      );
    }
    
    // Start analysis in background
    if (!request.streaming) {
      // Run in background
      runAnalysis(orchestrator, analysisId, request)
        .then(result => {
          // Update database record if available
          if (dbService) {
            dbService.updateAnalysisRequest(
              analysisId,
              'completed',
              result.results,
              undefined,
              result.executionTime * 1000 // Convert to milliseconds
            ).catch(error => {
              logger.error(`Failed to update analysis record: ${error.message}`, { error });
            });
          }
        })
        .catch(error => {
          logger.error(`Background analysis failed for ${analysisId}`, { error });
          
          // Update database record if available
          if (dbService) {
            dbService.updateAnalysisRequest(
              analysisId,
              'failed',
              undefined,
              error.message
            ).catch(dbError => {
              logger.error(`Failed to update analysis record: ${dbError.message}`, { error: dbError });
            });
          }
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
    
    // Update database record if available
    if (dbService) {
      await dbService.updateAnalysisRequest(
        analysisId,
        'completed',
        result.results,
        undefined,
        result.executionTime * 1000 // Convert to milliseconds
      );
    }
    
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
  const dbService = req.app.locals.dbService;
  
  // First check in-memory status
  const status = analysisStatus.get(analysisId);
  
  if (status) {
    res.json(status);
    return;
  }
  
  // If not in memory but we have a database, check there
  if (dbService) {
    dbService.getAnalysisRequest(analysisId)
      .then(request => {
        if (!request) {
          res.status(404).json({
            error: 'Analysis not found',
            code: 'ANALYSIS_NOT_FOUND',
            details: { analysisId },
          } as ErrorResponse);
          return;
        }
        
        // Convert to status format
        const analysisStatus: AnalysisStatus = {
          status: request.status,
          progress: request.status === 'completed' ? 1.0 : 
                   request.status === 'failed' ? 0 : 0.5,
          completedTypes: request.analysis_types,
          currentType: null,
          results: request.result_data,
          executionTime: request.execution_time_ms ? request.execution_time_ms / 1000 : undefined,
          error: request.error,
        };
        
        res.json(analysisStatus);
      })
      .catch(error => {
        logger.error(`Error retrieving analysis status: ${error.message}`, { error });
        res.status(500).json({
          error: 'Error retrieving analysis status',
          code: 'DATABASE_ERROR',
          details: {},
        } as ErrorResponse);
      });
    return;
  }
  
  // Not found in memory or database
  res.status(404).json({
    error: 'Analysis not found',
    code: 'ANALYSIS_NOT_FOUND',
    details: { analysisId },
  } as ErrorResponse);
};
app.get('/analyze/status/:analysisId', analysisStatusHandler);

// Workflow endpoint
const workflowHandler: RouteHandler = async (req, res): Promise<void> => {
  try {
    const { workflowName } = req.params;
    const workflows = req.app.locals.workflows;
    const orchestrator = req.app.locals.orchestrator;
    const dbService = req.app.locals.dbService;
    
    if (!workflows) {
      throw new Error('Workflows not initialized');
    }
    
    const workflow = workflows[camelCase(workflowName)];
    
    if (!workflow) {
      res.status(404).json({
        error: `Workflow ${workflowName} not found`,
        code: 'WORKFLOW_NOT_FOUND',
        details: { availableWorkflows: Object.keys(workflows).map(snakeCase) },
      } as ErrorResponse);
      return;
    }
    
    // Record workflow execution in database if available
    let workflowId: number | undefined;
    if (dbService) {
      workflowId = await dbService.recordWorkflowExecution(
        workflowName,
        'running',
        req.headers['x-user-id'] as string,
        req.body
      );
    }
    
    const startTime = Date.now();
    const result = await workflow.execute({
      workflowInput: req.body,
      orchestrator,
      userId: req.headers['x-user-id'] as string,
    });
    const executionTime = Date.now() - startTime;
    
    // Update workflow record in database if available
    if (dbService && workflowId) {
      await dbService.updateWorkflowExecution(
        workflowId,
        result.status,
        result.data,
        result.error,
        executionTime
      );
    }
    
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

// API Integration with BiteBase
const bitebaseIntegrationHandler: RouteHandler = async (req, res): Promise<void> => {
  try {
    const db = req.app.locals.db;
    
    if (!db) {
      throw new Error('Database not connected');
    }
    
    // Example of fetching data from D1 database
    const { results } = await db.prepare("SELECT * FROM comments LIMIT 5").all();
    
    res.json({
      integration: 'bitebase',
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('BiteBase integration error', { error });
    
    res.status(500).json({
      error: error.message,
      code: 'INTEGRATION_ERROR',
      details: {},
    } as ErrorResponse);
  }
};
app.get('/integration/bitebase', bitebaseIntegrationHandler);

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

// Utility functions
const camelCase = (str: string): string => {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
};

const snakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
};

export default app; 