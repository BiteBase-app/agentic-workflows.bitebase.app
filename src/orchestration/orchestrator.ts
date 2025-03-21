import { AgentType, AgentConfig, OrchestrationConfig, ResultAggregationMethod, AnalysisType } from '../config/agent-config';
import { BaseAgent, AgentResult } from '../agents/base-agent';
import { AnalysisRequest, AnalysisResponse } from '../api/models';
import logger from '../utils/logger';

/**
 * Class for coordinating multiple agents to analyze data
 */
export class AgentOrchestrator {
  private config: OrchestrationConfig;
  private agents: Map<AgentType, BaseAgent>;
  private logger = logger.child({ component: 'AgentOrchestrator' });
  private resultsCache: Map<string, any> = new Map();
  private runningTasks: Map<string, Promise<AgentResult>> = new Map();

  /**
   * Create a new agent orchestrator
   */
  constructor(
    config: Partial<OrchestrationConfig>,
    agents: Map<AgentType, BaseAgent> = new Map()
  ) {
    // Apply default values for any missing config options
    this.config = {
      maxConcurrentAgents: config.maxConcurrentAgents || 5,
      agentTimeout: config.agentTimeout || 30000,
      maxRetries: config.maxRetries || 3,
      resultAggregation: config.resultAggregation || ResultAggregationMethod.SIMPLE,
      cacheEnabled: config.cacheEnabled !== undefined ? config.cacheEnabled : true,
      cacheTTL: config.cacheTTL || 3600,
      priorityEnabled: config.priorityEnabled !== undefined ? config.priorityEnabled : true,
      analyzeByDefault: config.analyzeByDefault || []
    };
    this.agents = agents;
    this.logger.info('Initializing agent orchestrator');
  }

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(agent: BaseAgent): void {
    const agentConfig = agent.getConfig();
    if (!agentConfig.type) {
      this.logger.warn('Attempted to register agent without a type');
      return;
    }
    this.agents.set(agentConfig.type, agent);
    this.logger.info(`Registered agent of type ${agentConfig.type}`);
  }

  /**
   * Initialize all agents
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing agents');
    const initPromises: Promise<void>[] = [];
    
    for (const agent of this.agents.values()) {
      initPromises.push(agent.initialize());
    }
    
    await Promise.all(initPromises);
    this.logger.info('All agents initialized');
  }

  /**
   * Clean up all agents
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up agents');
    const cleanupPromises: Promise<void>[] = [];
    
    for (const agent of this.agents.values()) {
      cleanupPromises.push(agent.cleanup());
    }
    
    await Promise.all(cleanupPromises);
    this.resultsCache.clear();
    this.runningTasks.clear();
    this.logger.info('All agents cleaned up');
  }

  /**
   * Run analysis using the appropriate agents
   */
  async runAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
    const startTime = Date.now();
    const analysisId = `analysis_${Date.now()}_${request.projectId}`;
    
    try {
      this.logger.info(`Starting analysis ${analysisId}`, {
        projectId: request.projectId,
        analysisTypes: request.analysisTypes
      });
      
      // Get required agents based on analysis types
      const requiredAgents = this.getRequiredAgents(request.analysisTypes);
      
      if (requiredAgents.size === 0) {
        throw new Error('No suitable agents found for the requested analysis types');
      }
      
      // Create tasks for each agent
      const tasks: Promise<AgentResult>[] = [];
      const agentTypes: AgentType[] = [];
      
      for (const [agentType, agent] of requiredAgents.entries()) {
        const agentInput = this.prepareAgentInput(agent, request);
        const task = this.runAgentWithRetry(agent, agentInput, request.timeout * 1000);
        
        tasks.push(task);
        agentTypes.push(agentType);
        this.runningTasks.set(`${analysisId}_${agentType}`, task);
      }
      
      // Wait for all agents to complete
      const results = await Promise.all(tasks);
      
      // Process and aggregate results
      const processedResults = this.aggregateResults(agentTypes, results);
      
      // Cache results if enabled
      if (this.config.cacheEnabled) {
        this.resultsCache.set(analysisId, {
          results: processedResults,
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + this.config.cacheTTL * 1000)
        });
      }
      
      // Clean up tasks
      for (const agentType of agentTypes) {
        this.runningTasks.delete(`${analysisId}_${agentType}`);
      }
      
      // Create response
      const response: AnalysisResponse = {
        success: true,
        restaurantId: request.projectId,
        analysisTypes: request.analysisTypes,
        timestamp: new Date().toISOString(),
        executionTime: (Date.now() - startTime) / 1000,
        results: processedResults,
        metadata: {
          analysisId,
          agentsUsed: agentTypes,
          cacheTTL: this.config.cacheEnabled ? this.config.cacheTTL : 0
        }
      };
      
      this.logger.info(`Analysis ${analysisId} completed successfully`, {
        projectId: request.projectId,
        executionTime: response.executionTime
      });
      
      return response;
    } catch (error: any) {
      this.logger.error(`Analysis ${analysisId} failed`, {
        projectId: request.projectId,
        error: error.message
      });
      
      // Clean up any running tasks
      for (const [taskId, task] of this.runningTasks.entries()) {
        if (taskId.startsWith(analysisId)) {
          this.runningTasks.delete(taskId);
        }
      }
      
      throw error;
    }
  }

  /**
   * Run a single agent with retry logic
   */
  private async runAgentWithRetry(
    agent: BaseAgent,
    input: Record<string, any>,
    timeout: number
  ): Promise<AgentResult> {
    let lastError: any;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        this.logger.debug(`Running agent ${agent.constructor.name}, attempt ${attempt + 1}`);
        return await agent.run(input, timeout);
      } catch (error) {
        lastError = error;
        this.logger.warn(`Agent ${agent.constructor.name} failed, retrying (${attempt + 1}/${this.config.maxRetries})`, {
          error: error instanceof Error ? error.message : String(error)
        });
        
        if (attempt < this.config.maxRetries - 1) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, this.config.agentTimeout));
        }
      }
    }
    
    throw lastError || new Error('Agent execution failed after retries');
  }

  /**
   * Get required agents based on analysis types
   */
  private getRequiredAgents(analysisTypes: AnalysisType[]): Map<AgentType, BaseAgent> {
    const requiredAgents = new Map<AgentType, BaseAgent>();
    
    // Simple mapping between analysis types and agent types
    // In a real system, this could be more sophisticated
    for (const analysisType of analysisTypes) {
      let agentType: AgentType;
      
      switch (analysisType) {
        case AnalysisType.MARKET:
          agentType = AgentType.MARKET;
          break;
        case AnalysisType.INSIGHTS:
          agentType = AgentType.INSIGHTS;
          break;
        case AnalysisType.PRICING:
          agentType = AgentType.PRICING;
          break;
        case AnalysisType.SALES:
          agentType = AgentType.SALES;
          break;
        case AnalysisType.SENTIMENT:
          agentType = AgentType.SENTIMENT;
          break;
        case AnalysisType.TRAFFIC:
          agentType = AgentType.TRAFFIC;
          break;
        case AnalysisType.CHAT:
          agentType = AgentType.CHAT;
          break;
        default:
          continue;
      }
      
      const agent = this.agents.get(agentType);
      if (agent) {
        requiredAgents.set(agentType, agent);
      }
    }
    
    return requiredAgents;
  }

  /**
   * Prepare input data for an agent
   */
  private prepareAgentInput(agent: BaseAgent, request: AnalysisRequest): Record<string, any> {
    return {
      projectId: request.projectId,
      queryParams: request.queryParams || {},
      confidenceThreshold: request.confidenceThreshold,
      priority: request.priority,
      timeout: request.timeout
    };
  }

  /**
   * Aggregate results from multiple agents
   */
  private aggregateResults(
    agentTypes: AgentType[],
    results: AgentResult[]
  ): Record<string, any> {
    if (results.length === 0) {
      return {};
    }
    
    const aggregated: Record<string, any> = {};
    
    // Use the appropriate aggregation method
    switch (this.config.resultAggregation) {
      case ResultAggregationMethod.WEIGHTED:
        return this.weightedAggregation(agentTypes, results);
      case ResultAggregationMethod.CONFIDENCE:
        return this.confidenceAggregation(agentTypes, results);
      case ResultAggregationMethod.SIMPLE:
      default:
        return this.simpleAggregation(agentTypes, results);
    }
  }

  /**
   * Simple aggregation - combine all results
   */
  private simpleAggregation(
    agentTypes: AgentType[],
    results: AgentResult[]
  ): Record<string, any> {
    const aggregated: Record<string, any> = {};
    
    for (let i = 0; i < agentTypes.length; i++) {
      if (results[i].success) {
        aggregated[agentTypes[i]] = results[i].data;
      }
    }
    
    return aggregated;
  }

  /**
   * Weighted aggregation based on agent confidence
   */
  private weightedAggregation(
    agentTypes: AgentType[],
    results: AgentResult[]
  ): Record<string, any> {
    // In a real implementation, we would apply weights based on agent importance
    return this.simpleAggregation(agentTypes, results);
  }

  /**
   * Confidence-based aggregation
   */
  private confidenceAggregation(
    agentTypes: AgentType[],
    results: AgentResult[]
  ): Record<string, any> {
    // In a real implementation, we would filter or weight based on confidence
    return this.simpleAggregation(agentTypes, results);
  }
} 