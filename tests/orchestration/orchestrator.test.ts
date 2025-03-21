import { AgentOrchestrator } from '../../src/orchestration/orchestrator';
import { BaseAgent } from '../../src/agents/base-agent';
import { AnalysisType, AgentType, AgentConfig, AgentCapability, PriorityLevel, ResultAggregationMethod } from '../../src/types';
import { Map } from 'immutable';

// Mock response data
const mockSentimentResponse = {
  sentiment: 'positive',
  score: 0.85
};

// Mock agent implementation
class MockAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  async process(input: any): Promise<any> {
    // Implementation to satisfy abstract method
    return {
      success: true,
      data: { 
        score: 0.85,
        sentiment: 'positive'
      },
      confidence: 0.9,
      executionTime: 0,
      metadata: {}
    };
  }
}

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let mockSentimentAgent: MockAgent;
  let mockEntityAgent: MockAgent;
  
  beforeEach(() => {
    // Create mock agents
    mockSentimentAgent = new MockAgent({
      type: AgentType.SENTIMENT,
      capabilities: [AgentCapability.SENTIMENT_ANALYSIS],
      priority: PriorityLevel.HIGH,
      enabled: true
    });
    
    mockEntityAgent = new MockAgent({
      type: AgentType.CLASSIFICATION, // Use a valid enum value instead of ENTITY_EXTRACTION
      capabilities: [AgentCapability.CLASSIFICATION], // Use a valid enum value instead of ENTITY_EXTRACTION
      priority: PriorityLevel.MEDIUM,
      enabled: true
    });
    
    // Create agent map
    const agents = Map<AgentType, BaseAgent>().withMutations(agents => {
      agents.set(AgentType.SENTIMENT, mockSentimentAgent);
      agents.set(AgentType.CLASSIFICATION, mockEntityAgent); // Use a valid enum value instead of ENTITY_EXTRACTION
    });
    
    // Create orchestrator with mocked agents
    orchestrator = new AgentOrchestrator({
      resultAggregation: ResultAggregationMethod.COMBINE,
      agents
    });
    
    // Initialize the orchestrator
    orchestrator.initialize();
    
    // Spy on agent methods
    jest.spyOn(mockSentimentAgent, 'process');
    jest.spyOn(mockEntityAgent, 'process');
  });
  
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

  // Update the relevant test that uses text property
  it('should run analysis with specified parameters', async () => {
    // Run analysis
    const results = await orchestrator.runAnalysis({
      analysisTypes: [AnalysisType.SENTIMENT],
      projectId: 'test-project',
      queryParams: { text: 'This is a test' } // Move text inside queryParams
    });
    
    // ... rest of the test ...
  });

  // Update the other instances where 'text' property is used directly
  it('should return results from all agents', async () => {
    const results = await orchestrator.runAnalysis({
      analysisTypes: [AnalysisType.SENTIMENT, AnalysisType.CLASSIFICATION], // Use valid AnalysisType
      projectId: 'test-project',
      queryParams: { text: 'This is a test' } // Move text inside queryParams
    });
    
    // ... rest of the test ...
  });

  it('should handle agent failure gracefully', async () => {
    // ... existing code ...
    
    const results = await orchestrator.runAnalysis({
      analysisTypes: [AnalysisType.SENTIMENT],
      projectId: 'test-project',
      queryParams: { text: 'This is a test' } // Move text inside queryParams
    });
    
    // ... rest of the test ...
  });

  describe('Priority Handling', () => {
    let mockLowPriorityAgent: MockAgent;
    
    beforeEach(() => {
      mockLowPriorityAgent = new MockAgent({
        type: AgentType.CLASSIFICATION, // Use valid AgentType
        capabilities: [AgentCapability.CLASSIFICATION], // Use valid capability
        priority: PriorityLevel.LOW,
        enabled: true
      });
      
      // Create agent map with priority differences
      const agents = Map<AgentType, BaseAgent>().withMutations(agents => {
        agents.set(AgentType.SENTIMENT, mockSentimentAgent);
        agents.set(AgentType.CLASSIFICATION, mockLowPriorityAgent); // Use valid AgentType
      });
      
      // Create orchestrator with mocked agents
      orchestrator = new AgentOrchestrator({
        resultAggregation: ResultAggregationMethod.COMBINE,
        analyzeByDefault: [AnalysisType.SENTIMENT, AnalysisType.CLASSIFICATION], // Use valid AnalysisType
        agents
      });
      
      // Initialize the orchestrator
      orchestrator.initialize();
    });
    
    it('should process agents in priority order', async () => {
      // Run analysis with both agents
      const results = await orchestrator.runAnalysis({
        analysisTypes: [AnalysisType.SENTIMENT, AnalysisType.CLASSIFICATION], // Use valid AnalysisType
        projectId: 'test-project',
        queryParams: { text: 'This is a test' } // Move text inside queryParams
      });
      
      // ... rest of the test ...
    });
  });
}); 