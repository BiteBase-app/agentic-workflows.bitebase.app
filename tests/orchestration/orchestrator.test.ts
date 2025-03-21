import { AgentOrchestrator } from '../../src/orchestration/orchestrator';
import { BaseAgent } from '../../src/agents/base-agent';
import { 
  AgentType, 
  AgentCapability, 
  ResultAggregationMethod, 
  AnalysisType,
  PriorityLevel
} from '../../src/config/agent-config';

// Mock agent class
class MockAgent extends BaseAgent {
  constructor(config: any, private mockResponse: any = { processed: true }) {
    super(config);
  }

  async processRequest(input: any): Promise<any> {
    return this.mockResponse;
  }
}

describe('AgentOrchestrator', () => {
  // Test orchestrator initialization
  describe('Orchestrator Initialization', () => {
    it('should initialize successfully with agents', async () => {
      const mockAgent = new MockAgent({
        enabled: true,
        capabilities: [AgentCapability.SENTIMENT_ANALYSIS],
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        contextWindow: 16000,
        memoryEnabled: true,
        usesTools: true,
        timeout: 30000,
        maxRetries: 3,
        priority: PriorityLevel.MEDIUM,
      });

      const agents = new Map<AgentType, BaseAgent>();
      agents.set(AgentType.SENTIMENT, mockAgent);

      const orchestrator = new AgentOrchestrator({
        maxConcurrentAgents: 5,
        agentTimeout: 30000,
        maxRetries: 3,
        resultAggregation: ResultAggregationMethod.SIMPLE,
        cacheEnabled: true,
        cacheTTL: 3600,
        priorityEnabled: true,
        analyzeByDefault: [AnalysisType.SENTIMENT],
      }, agents);

      const initResult = await orchestrator.initialize();
      expect(initResult).toBe(true);
    });
  });

  // Test agent selection
  describe('Agent Selection', () => {
    it('should select appropriate agents based on analysis type', async () => {
      const mockSentimentAgent = new MockAgent({
        enabled: true,
        capabilities: [AgentCapability.SENTIMENT_ANALYSIS],
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        contextWindow: 16000,
        memoryEnabled: true,
        usesTools: true,
        timeout: 30000,
        maxRetries: 3,
        priority: PriorityLevel.MEDIUM,
      });

      const mockEntityAgent = new MockAgent({
        enabled: true,
        capabilities: [AgentCapability.ENTITY_EXTRACTION],
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        contextWindow: 16000,
        memoryEnabled: true,
        usesTools: true,
        timeout: 30000,
        maxRetries: 3,
        priority: PriorityLevel.MEDIUM,
      });

      const agents = new Map<AgentType, BaseAgent>();
      agents.set(AgentType.SENTIMENT, mockSentimentAgent);
      agents.set(AgentType.ENTITY_EXTRACTION, mockEntityAgent);

      const orchestrator = new AgentOrchestrator({
        maxConcurrentAgents: 5,
        agentTimeout: 30000,
        maxRetries: 3,
        resultAggregation: ResultAggregationMethod.SIMPLE,
        cacheEnabled: true,
        cacheTTL: 3600,
        priorityEnabled: true,
        analyzeByDefault: [AnalysisType.SENTIMENT],
      }, agents);

      await orchestrator.initialize();

      // Use a spy to check which agents are selected
      const processSpy = jest.spyOn(mockSentimentAgent, 'process');
      
      await orchestrator.runAnalysis({
        projectId: 'test-project',
        analysisTypes: [AnalysisType.SENTIMENT],
        text: 'This is a test',
        streaming: false,
      });

      expect(processSpy).toHaveBeenCalled();
    });
  });

  // Test analysis execution
  describe('Analysis Execution', () => {
    it('should run analysis and return results', async () => {
      const sentimentResult = { 
        sentiment: 'positive', 
        score: 0.75
      };
      
      const mockSentimentAgent = new MockAgent({
        enabled: true,
        capabilities: [AgentCapability.SENTIMENT_ANALYSIS],
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        contextWindow: 16000,
        memoryEnabled: true,
        usesTools: true,
        timeout: 30000,
        maxRetries: 3,
        priority: PriorityLevel.MEDIUM,
      }, sentimentResult);

      const agents = new Map<AgentType, BaseAgent>();
      agents.set(AgentType.SENTIMENT, mockSentimentAgent);

      const orchestrator = new AgentOrchestrator({
        maxConcurrentAgents: 5,
        agentTimeout: 30000,
        maxRetries: 3,
        resultAggregation: ResultAggregationMethod.SIMPLE,
        cacheEnabled: true,
        cacheTTL: 3600,
        priorityEnabled: true,
        analyzeByDefault: [AnalysisType.SENTIMENT],
      }, agents);

      await orchestrator.initialize();

      const result = await orchestrator.runAnalysis({
        projectId: 'test-project',
        analysisTypes: [AnalysisType.SENTIMENT],
        text: 'This is a test',
        streaming: false,
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('results.sentiment');
      expect(result.results.sentiment).toEqual(sentimentResult);
    });

    it('should handle analysis failures gracefully', async () => {
      const mockSentimentAgent = new MockAgent({
        enabled: true,
        capabilities: [AgentCapability.SENTIMENT_ANALYSIS],
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        contextWindow: 16000,
        memoryEnabled: true,
        usesTools: true,
        timeout: 30000,
        maxRetries: 3,
        priority: PriorityLevel.MEDIUM,
      });

      // Override processRequest to throw an error
      mockSentimentAgent.processRequest = jest.fn().mockRejectedValue(new Error('Analysis failed'));

      const agents = new Map<AgentType, BaseAgent>();
      agents.set(AgentType.SENTIMENT, mockSentimentAgent);

      const orchestrator = new AgentOrchestrator({
        maxConcurrentAgents: 5,
        agentTimeout: 30000,
        maxRetries: 3,
        resultAggregation: ResultAggregationMethod.SIMPLE,
        cacheEnabled: true,
        cacheTTL: 3600,
        priorityEnabled: true,
        analyzeByDefault: [AnalysisType.SENTIMENT],
      }, agents);

      await orchestrator.initialize();

      await expect(async () => {
        await orchestrator.runAnalysis({
          projectId: 'test-project',
          analysisTypes: [AnalysisType.SENTIMENT],
          text: 'This is a test',
          streaming: false,
        });
      }).rejects.toThrow();
    });
  });

  // Test priority handling
  describe('Priority Handling', () => {
    it('should process agents in priority order', async () => {
      const mockHighPriorityAgent = new MockAgent({
        enabled: true,
        capabilities: [AgentCapability.SENTIMENT_ANALYSIS],
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        contextWindow: 16000,
        memoryEnabled: true,
        usesTools: true,
        timeout: 30000,
        maxRetries: 3,
        priority: PriorityLevel.HIGH,
      }, { priority: 'high' });

      const mockLowPriorityAgent = new MockAgent({
        enabled: true,
        capabilities: [AgentCapability.ENTITY_EXTRACTION],
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        contextWindow: 16000,
        memoryEnabled: true,
        usesTools: true,
        timeout: 30000,
        maxRetries: 3,
        priority: PriorityLevel.LOW,
      }, { priority: 'low' });

      const executionOrder: string[] = [];
      
      // Override process methods to track execution order
      mockHighPriorityAgent.process = jest.fn().mockImplementation(async () => {
        executionOrder.push('high');
        return { priority: 'high' };
      });
      
      mockLowPriorityAgent.process = jest.fn().mockImplementation(async () => {
        executionOrder.push('low');
        return { priority: 'low' };
      });

      const agents = new Map<AgentType, BaseAgent>();
      agents.set(AgentType.SENTIMENT, mockHighPriorityAgent);
      agents.set(AgentType.ENTITY_EXTRACTION, mockLowPriorityAgent);

      const orchestrator = new AgentOrchestrator({
        maxConcurrentAgents: 1, // Force sequential processing
        agentTimeout: 30000,
        maxRetries: 3,
        resultAggregation: ResultAggregationMethod.SIMPLE,
        cacheEnabled: true,
        cacheTTL: 3600,
        priorityEnabled: true,
        analyzeByDefault: [AnalysisType.SENTIMENT, AnalysisType.ENTITY_EXTRACTION],
      }, agents);

      await orchestrator.initialize();

      await orchestrator.runAnalysis({
        projectId: 'test-project',
        analysisTypes: [AnalysisType.SENTIMENT, AnalysisType.ENTITY_EXTRACTION],
        text: 'This is a test',
        streaming: false,
      });

      // The first item should be 'high'
      expect(executionOrder[0]).toBe('high');
    });
  });
}); 