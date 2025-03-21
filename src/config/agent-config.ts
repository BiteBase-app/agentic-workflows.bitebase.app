/**
 * Agent capability types for defining what an agent can do
 */
export enum AgentCapability {
  MARKET_ANALYSIS = 'market_analysis',
  INSIGHTS_GENERATION = 'insights_generation',
  PRICING_OPTIMIZATION = 'pricing_optimization',
  SALES_FORECASTING = 'sales_forecasting',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  DATA_SCRAPING = 'data_scraping',
  TRAFFIC_ANALYSIS = 'traffic_analysis',
  CHAT = 'chat',
}

/**
 * Agent types for identifying different kinds of agents
 */
export enum AgentType {
  MARKET = 'market',
  INSIGHTS = 'insights',
  PRICING = 'pricing',
  SALES = 'sales',
  SENTIMENT = 'sentiment',
  SCRAPING = 'scraping',
  TRAFFIC = 'traffic',
  CHAT = 'chat',
}

/**
 * Analysis types that can be requested
 */
export enum AnalysisType {
  MARKET = 'market',
  INSIGHTS = 'insights',
  PRICING = 'pricing',
  SALES = 'sales',
  SENTIMENT = 'sentiment',
  TRAFFIC = 'traffic',
  CHAT = 'chat',
}

/**
 * Priority levels for analysis tasks
 */
export enum PriorityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Configuration for an individual agent
 */
export interface AgentConfig {
  enabled: boolean;
  capabilities: AgentCapability[];
  model: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
  memoryEnabled: boolean;
  usesTools: boolean;
  timeout: number;
  maxRetries: number;
  priority: PriorityLevel;
}

/**
 * Result aggregation method for orchestrator
 */
export enum ResultAggregationMethod {
  SIMPLE = 'simple',
  WEIGHTED = 'weighted',
  CONFIDENCE = 'confidence',
}

/**
 * Configuration for the agent orchestration system
 */
export interface OrchestrationConfig {
  maxConcurrentAgents: number;
  agentTimeout: number;
  maxRetries: number;
  resultAggregation: ResultAggregationMethod;
  cacheEnabled: boolean;
  cacheTTL: number;
  priorityEnabled: boolean;
  analyzeByDefault: AnalysisType[];
} 