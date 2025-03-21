import { AgentOrchestrator } from '../orchestration/orchestrator';
import logger from '../utils/logger';

/**
 * Context data for workflow execution
 */
export interface WorkflowContext {
  workflowInput: Record<string, any>;
  orchestrator?: AgentOrchestrator;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Workflow result data
 */
export interface WorkflowResult {
  status: 'completed' | 'failed' | 'partial';
  data: Record<string, any>;
  error?: string;
  executionTime: number;
  metadata?: Record<string, any>;
}

/**
 * Base workflow class all workflows should extend
 */
export abstract class Workflow {
  protected name: string;
  protected description: string;
  protected scheduleEnabled: boolean;
  protected logger = logger.child({ component: 'Workflow' });

  constructor(name: string, description: string, scheduleEnabled = false) {
    this.name = name;
    this.description = description;
    this.scheduleEnabled = scheduleEnabled;
  }

  /**
   * Execute the workflow with given context
   */
  abstract execute(context: WorkflowContext): Promise<WorkflowResult>;

  /**
   * Get workflow information
   */
  getInfo(): Record<string, any> {
    return {
      name: this.name,
      description: this.description,
      scheduleEnabled: this.scheduleEnabled,
    };
  }
}

/**
 * Customer support workflow implementation
 */
export class CustomerSupportWorkflow extends Workflow {
  constructor() {
    super(
      'customer_support',
      'Handles customer support requests and routes them to appropriate agents',
      true
    );
    this.logger = logger.child({ workflow: this.name });
  }

  /**
   * Execute the customer support workflow
   */
  async execute(context: WorkflowContext): Promise<WorkflowResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Executing customer support workflow', { 
        input: context.workflowInput 
      });
      
      // In a real implementation, we would use agents to process the request
      // For this example, we'll simulate the workflow
      
      // Extract input data
      const { query, customerId, priority } = context.workflowInput;
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Prepare result
      const result: WorkflowResult = {
        status: 'completed',
        executionTime: (Date.now() - startTime) / 1000,
        data: {
          query,
          customerId,
          resolution: 'Support ticket created and assigned',
          ticketId: `SUP-${Date.now().toString().slice(-6)}`,
          priority: priority || 'medium',
          estimatedResponseTime: '24 hours',
          category: this.categorizeQuery(query),
        },
        metadata: {
          workflowName: this.name,
          processedAt: new Date().toISOString(),
        }
      };
      
      this.logger.info('Customer support workflow completed', {
        executionTime: result.executionTime,
        ticketId: result.data.ticketId
      });
      
      return result;
    } catch (error: any) {
      this.logger.error('Customer support workflow failed', { error: error.message });
      
      return {
        status: 'failed',
        executionTime: (Date.now() - startTime) / 1000,
        data: {},
        error: error.message,
        metadata: {
          workflowName: this.name,
          failedAt: new Date().toISOString(),
        }
      };
    }
  }
  
  /**
   * Categorize customer query
   */
  private categorizeQuery(query: string): string {
    // In a real implementation, we would use NLP to categorize the query
    // For this example, we'll use a simple keyword-based approach
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('billing') || queryLower.includes('payment') || queryLower.includes('charge')) {
      return 'billing';
    } else if (queryLower.includes('order') || queryLower.includes('delivery')) {
      return 'orders';
    } else if (queryLower.includes('account') || queryLower.includes('login') || queryLower.includes('password')) {
      return 'account';
    } else if (queryLower.includes('menu') || queryLower.includes('food') || queryLower.includes('item')) {
      return 'menu';
    } else {
      return 'general';
    }
  }
} 