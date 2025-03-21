import { DbService } from '../../src/services/db-service';

// Mock D1 database
const mockD1Database = {
  prepare: jest.fn().mockReturnValue({
    bind: jest.fn().mockReturnThis(),
    run: jest.fn().mockResolvedValue({ meta: { last_row_id: 1 } }),
    all: jest.fn().mockResolvedValue({
      results: [
        {
          id: 1,
          workflow_name: 'customer-support',
          status: 'completed',
          user_id: 'user-123',
          input_data: '{"query":"test query"}',
          output_data: '{"result":"test result"}',
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          execution_time_ms: 1000
        }
      ]
    })
  })
};

describe('DbService', () => {
  let dbService: DbService;

  beforeEach(() => {
    jest.clearAllMocks();
    dbService = new DbService(mockD1Database as any);
  });

  describe('Workflow Executions', () => {
    it('should record a workflow execution', async () => {
      const result = await dbService.recordWorkflowExecution(
        'customer-support',
        'running',
        'user-123',
        { query: 'test query' }
      );

      expect(result).toBe(1);
      expect(mockD1Database.prepare).toHaveBeenCalled();
    });

    it('should update a workflow execution', async () => {
      await dbService.updateWorkflowExecution(
        1,
        'completed',
        { result: 'test result' },
        undefined,
        1000
      );

      expect(mockD1Database.prepare).toHaveBeenCalled();
    });

    it('should get a workflow execution', async () => {
      const result = await dbService.getWorkflowExecution(1);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('workflow_name', 'customer-support');
      expect(result).toHaveProperty('input_data.query', 'test query');
      expect(result).toHaveProperty('output_data.result', 'test result');
    });

    it('should handle errors when recording workflow execution', async () => {
      mockD1Database.prepare.mockReturnValueOnce({
        bind: jest.fn().mockReturnThis(),
        run: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(async () => {
        await dbService.recordWorkflowExecution(
          'customer-support',
          'running',
          'user-123',
          { query: 'test query' }
        );
      }).rejects.toThrow('Database error');
    });
  });

  describe('Analysis Requests', () => {
    it('should record an analysis request', async () => {
      const result = await dbService.recordAnalysisRequest(
        'analysis-123',
        'project-123',
        'pending',
        ['sentiment'],
        { text: 'Test text' }
      );

      expect(result).toBe(1);
      expect(mockD1Database.prepare).toHaveBeenCalled();
    });

    it('should update an analysis request', async () => {
      await dbService.updateAnalysisRequest(
        'analysis-123',
        'completed',
        { sentiment: { score: 0.75 } },
        undefined,
        1000
      );

      expect(mockD1Database.prepare).toHaveBeenCalled();
    });

    it('should get an analysis request', async () => {
      // Override mock for this specific test
      mockD1Database.prepare.mockReturnValueOnce({
        bind: jest.fn().mockReturnThis(),
        all: jest.fn().mockResolvedValue({
          results: [
            {
              id: 1,
              analysis_id: 'analysis-123',
              project_id: 'project-123',
              status: 'completed',
              analysis_types: 'sentiment',
              request_data: '{"text":"Test text"}',
              result_data: '{"sentiment":{"score":0.75}}',
              created_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              execution_time_ms: 1000
            }
          ]
        })
      });

      const result = await dbService.getAnalysisRequest('analysis-123');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('analysis_id', 'analysis-123');
      expect(result).toHaveProperty('request_data.text', 'Test text');
      expect(result).toHaveProperty('result_data.sentiment.score', 0.75);
      expect(result).toHaveProperty('analysis_types');
      expect(Array.isArray(result.analysis_types)).toBe(true);
    });

    it('should handle missing analysis requests', async () => {
      // Override mock for this specific test
      mockD1Database.prepare.mockReturnValueOnce({
        bind: jest.fn().mockReturnThis(),
        all: jest.fn().mockResolvedValue({
          results: []
        })
      });

      const result = await dbService.getAnalysisRequest('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('Agent Executions', () => {
    it('should record an agent execution', async () => {
      const result = await dbService.recordAgentExecution(
        'sentiment',
        'completed',
        1,
        undefined,
        0.95,
        { text: 'Test text' },
        { sentiment: 'positive', score: 0.85 }
      );

      expect(result).toBe(1);
      expect(mockD1Database.prepare).toHaveBeenCalled();
    });

    it('should get agent executions for a workflow', async () => {
      // Override mock for this specific test
      mockD1Database.prepare.mockReturnValueOnce({
        bind: jest.fn().mockReturnThis(),
        all: jest.fn().mockResolvedValue({
          results: [
            {
              id: 1,
              agent_type: 'sentiment',
              workflow_execution_id: 1,
              status: 'completed',
              confidence: 0.95,
              input_data: '{"text":"Test text"}',
              output_data: '{"sentiment":"positive","score":0.85}',
              created_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              execution_time_ms: 500
            }
          ]
        })
      });

      const result = await dbService.getAgentExecutions({ workflowExecutionId: 1 });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('agent_type', 'sentiment');
      expect(result[0]).toHaveProperty('input_data.text', 'Test text');
      expect(result[0]).toHaveProperty('output_data.sentiment', 'positive');
    });

    it('should get agent executions for an analysis request', async () => {
      // Override mock for this specific test
      mockD1Database.prepare.mockReturnValueOnce({
        bind: jest.fn().mockReturnThis(),
        all: jest.fn().mockResolvedValue({
          results: [
            {
              id: 1,
              agent_type: 'sentiment',
              analysis_request_id: 1,
              status: 'completed',
              confidence: 0.95,
              input_data: '{"text":"Test text"}',
              output_data: '{"sentiment":"positive","score":0.85}',
              created_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              execution_time_ms: 500
            }
          ]
        })
      });

      const result = await dbService.getAgentExecutions({ analysisRequestId: 1 });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('agent_type', 'sentiment');
    });

    it('should require either workflowExecutionId or analysisRequestId', async () => {
      await expect(async () => {
        await dbService.getAgentExecutions({});
      }).rejects.toThrow('Either workflowExecutionId or analysisRequestId must be provided');
    });
  });
}); 