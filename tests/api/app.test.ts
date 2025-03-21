import request from 'supertest';
import express from 'express';
import app from '../../src/app';
import { AgentOrchestrator } from '../../src/orchestration/orchestrator';
import { CustomerSupportWorkflow } from '../../src/workflows/workflow';
import { AnalysisType } from '../../src/config/agent-config';
import { DbService } from '../../src/services/db-service';
import { BiteBaseService } from '../../src/services/bitebase-service';

// Mock agent orchestrator
const mockOrchestrator = {
  initialize: jest.fn().mockResolvedValue(true),
  runAnalysis: jest.fn().mockResolvedValue({
    success: true,
    results: {
      sentiment: {
        sentiment: 'positive',
        score: 0.75,
      }
    },
    executionTime: 0.5
  }),
  cleanup: jest.fn().mockResolvedValue(true)
} as unknown as AgentOrchestrator;

// Mock workflows
const mockWorkflows = {
  customerSupport: {
    execute: jest.fn().mockResolvedValue({
      status: 'completed',
      data: {
        ticketId: 'ticket-123',
        sentiment: {
          sentiment: 'positive',
          score: 0.75
        }
      }
    })
  }
};

// Mock DB Service
const mockDbService = {
  recordAnalysisRequest: jest.fn().mockResolvedValue(1),
  updateAnalysisRequest: jest.fn().mockResolvedValue(undefined),
  getAnalysisRequest: jest.fn().mockResolvedValue({
    status: 'completed',
    analysis_types: ['sentiment'],
    result_data: {
      sentiment: {
        sentiment: 'positive',
        score: 0.75
      }
    }
  }),
  recordWorkflowExecution: jest.fn().mockResolvedValue(1),
  updateWorkflowExecution: jest.fn().mockResolvedValue(undefined)
} as unknown as DbService;

// Mock BiteBase Service
const mockBitebaseService = {
  getApiInfo: jest.fn().mockResolvedValue({
    version: '1.0.0',
    environment: 'test'
  }),
  forwardAnalysis: jest.fn().mockResolvedValue({
    success: true,
    analysisId: 'bitebase-analysis-123'
  })
} as unknown as BiteBaseService;

describe('Express App', () => {
  beforeEach(() => {
    // Setup app locals
    app.locals.orchestrator = mockOrchestrator;
    app.locals.workflows = mockWorkflows;
    app.locals.dbService = mockDbService;
    app.locals.bitebaseService = mockBitebaseService;
    
    // Reset mock functions
    jest.clearAllMocks();
  });

  describe('API Endpoints', () => {
    // Test root endpoint
    it('GET / should return API information', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'online');
      expect(response.body).toHaveProperty('service', 'Agentic Workflow API');
      expect(response.body).toHaveProperty('endpoints');
    });

    // Test health check endpoint
    it('GET /health should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('details');
    });

    // Test analyze endpoint
    it('POST /analyze should start analysis and return info', async () => {
      const response = await request(app)
        .post('/analyze')
        .send({
          projectId: 'test-project',
          analysisTypes: ['sentiment'],
          text: 'This is a test message',
          streaming: false
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('results.analysisId');
      expect(mockOrchestrator.runAnalysis).toHaveBeenCalled();
      expect(mockDbService.recordAnalysisRequest).toHaveBeenCalled();
    });

    it('POST /analyze with streaming should return complete results', async () => {
      const analysisRequest = {
        projectId: 'test-project',
        analysisTypes: [AnalysisType.SENTIMENT],
        text: 'This is a test message',
        streaming: true
      };

      const response = await request(app)
        .post('/analyze')
        .send(analysisRequest);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('results.sentiment');
      expect(mockOrchestrator.runAnalysis).toHaveBeenCalled();
      expect(mockDbService.recordAnalysisRequest).toHaveBeenCalled();
      expect(mockDbService.updateAnalysisRequest).toHaveBeenCalled();
    });

    // Test analysis status endpoint
    it('GET /analyze/status/:analysisId should return status', async () => {
      const analysisId = 'test-analysis-id';
      
      const response = await request(app).get(`/analyze/status/${analysisId}`);
      
      expect(response.status).toBe(200);
      expect(mockDbService.getAnalysisRequest).toHaveBeenCalledWith(analysisId);
    });

    // Test workflow endpoint
    it('POST /workflow/:workflowName should execute workflow', async () => {
      const workflowName = 'customer-support';
      const workflowInput = {
        query: 'I have an issue with my order',
        customerId: 'customer-123',
        priority: 'high'
      };

      const response = await request(app)
        .post(`/workflow/${workflowName}`)
        .send(workflowInput);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('data.ticketId');
      expect(mockWorkflows.customerSupport.execute).toHaveBeenCalled();
      expect(mockDbService.recordWorkflowExecution).toHaveBeenCalled();
    });

    // Test integration endpoint
    it('GET /integration/bitebase should return integration data', async () => {
      // Mock DB query result
      app.locals.db = {
        prepare: jest.fn().mockReturnValue({
          all: jest.fn().mockResolvedValue({
            results: [
              { id: 1, author: 'Test Author', content: 'Test Comment' }
            ]
          })
        })
      };

      const response = await request(app).get('/integration/bitebase');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('integration', 'bitebase');
      expect(response.body).toHaveProperty('data');
    });

    // Test 404 handler
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app).get('/unknown-endpoint');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
      expect(response.body).toHaveProperty('code', 'ENDPOINT_NOT_FOUND');
    });
  });
}); 