import { AgentConfig, AgentCapability } from '../../config/agent-config';
import { OpenAI } from 'openai';
import { config } from '../../config/environment';
import logger from '../../utils/logger';

/**
 * Agent memory model for storing state
 */
export interface AgentMemory {
  conversationHistory: Array<Record<string, any>>;
  context: Record<string, any>;
  lastUpdate: Date;
  metadata: Record<string, any>;
}

/**
 * Agent result model for standardized outputs
 */
export interface AgentResult {
  success: boolean;
  data: Record<string, any>;
  confidence: number;
  executionTime: number;
  metadata: Record<string, any>;
  error?: string;
}

/**
 * Base agent class that all specialized agents extend
 */
export abstract class BaseAgent {
  protected config: AgentConfig;
  protected memory: AgentMemory;
  protected tools: any[];
  protected logger: typeof logger;
  protected openaiClient: OpenAI;
  private isRunning: boolean = false;
  private lastResult?: AgentResult;

  /**
   * Create a new agent
   */
  constructor(
    config: AgentConfig,
    memory?: AgentMemory,
    tools: any[] = []
  ) {
    this.config = config;
    this.memory = memory || {
      conversationHistory: [],
      context: {},
      lastUpdate: new Date(),
      metadata: {}
    };
    this.tools = tools;
    this.logger = logger.child({ agent: this.constructor.name });
    
    // Initialize OpenAI client
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || config.model,
    });
  }

  /**
   * Get agent capabilities
   */
  get capabilities(): AgentCapability[] {
    return this.config.capabilities;
  }

  /**
   * Check if agent is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Get last execution result
   */
  get result(): AgentResult | undefined {
    return this.lastResult;
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Initialize agent resources
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing agent');
    await this.setupTools();
    await this.loadMemory();
  }

  /**
   * Clean up agent resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up agent');
    await this.saveMemory();
    await this.cleanupTools();
  }

  /**
   * Process input data and return results - to be implemented by subclasses
   */
  abstract process(inputData: Record<string, any>): Promise<AgentResult>;

  /**
   * Run the agent with timeout and retry logic
   */
  async run(
    inputData: Record<string, any>,
    timeout?: number
  ): Promise<AgentResult> {
    if (this.isRunning) {
      throw new Error('Agent is already running');
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      // Apply timeout if specified
      let result: AgentResult;
      if (timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Agent timeout')), timeout);
        });
        
        result = await Promise.race([
          this.process(inputData),
          timeoutPromise
        ]);
      } else {
        result = await this.process(inputData);
      }

      // Update memory and metadata
      this.updateMemory(inputData, result);
      
      // Calculate execution time
      result.executionTime = (Date.now() - startTime) / 1000;
      
      // Store last result
      this.lastResult = result;
      
      return result;
    } catch (error: any) {
      this.logger.error(`Agent error: ${error.message}`, { error });
      
      // Create error result
      const errorResult: AgentResult = {
        success: false,
        data: {},
        confidence: 0,
        executionTime: (Date.now() - startTime) / 1000,
        metadata: { error: true },
        error: error.message
      };
      
      // Store last result
      this.lastResult = errorResult;
      
      return errorResult;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Set up agent tools
   */
  protected async setupTools(): Promise<void> {
    // To be implemented by subclasses if needed
  }

  /**
   * Clean up agent tools
   */
  protected async cleanupTools(): Promise<void> {
    // To be implemented by subclasses if needed
  }

  /**
   * Load agent memory
   */
  protected async loadMemory(): Promise<void> {
    // To be implemented by subclasses if needed
  }

  /**
   * Save agent memory
   */
  protected async saveMemory(): Promise<void> {
    // To be implemented by subclasses if needed
  }

  /**
   * Update agent memory with new data
   */
  protected updateMemory(inputData: Record<string, any>, result: AgentResult): void {
    // Add to conversation history
    this.memory.conversationHistory.push({
      input: inputData,
      output: result,
      timestamp: new Date()
    });
    
    // Limit history size
    const maxHistory = 50;
    if (this.memory.conversationHistory.length > maxHistory) {
      this.memory.conversationHistory = this.memory.conversationHistory.slice(-maxHistory);
    }
    
    // Update context and metadata
    this.memory.context = {
      ...this.memory.context,
      lastInput: inputData,
      lastOutput: result
    };
    
    this.memory.lastUpdate = new Date();
  }

  /**
   * Check if agent has specific capability
   */
  hasCapability(capability: AgentCapability): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Get a specific tool by name
   */
  getTool(toolName: string): any | undefined {
    return this.tools.find(tool => tool.name === toolName);
  }

  /**
   * Convert agent to serializable object
   */
  toJSON(): Record<string, any> {
    return {
      type: this.constructor.name,
      capabilities: this.capabilities,
      config: this.config,
      memory: {
        lastUpdate: this.memory.lastUpdate,
        contextSize: Object.keys(this.memory.context).length,
        historySize: this.memory.conversationHistory.length
      },
      isRunning: this.isRunning
    };
  }
} 