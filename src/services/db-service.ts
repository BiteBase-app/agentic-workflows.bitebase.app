/**
 * D1 Database Service for Agentic Workflow
 * 
 * Provides a simplified interface for interacting with Cloudflare D1 database
 */

import { D1Database } from '@cloudflare/workers-types';
import logger from '../utils/logger';

/**
 * Helper function to extract error message safely
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Database service for interacting with D1
 */
export class DbService {
  private db: D1Database;
  private logger = logger.child({ service: 'DbService' });

  /**
   * Create a new database service
   */
  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Record a new workflow execution
   */
  async recordWorkflowExecution(
    workflowName: string,
    status: string,
    userId?: string,
    inputData?: any,
    outputData?: any,
    error?: string,
    executionTimeMs?: number
  ): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO workflow_executions 
        (workflow_name, status, user_id, input_data, output_data, error, execution_time_ms, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const completedAt = status === 'completed' || status === 'failed' 
        ? new Date().toISOString() 
        : null;

      const { meta } = await stmt.bind(
        workflowName,
        status,
        userId || null,
        inputData ? JSON.stringify(inputData) : null,
        outputData ? JSON.stringify(outputData) : null,
        error || null,
        executionTimeMs || null,
        completedAt
      ).run();

      return meta.last_row_id;
    } catch (error: unknown) {
      this.logger.error(`Error recording workflow execution: ${getErrorMessage(error)}`, { error });
      throw error;
    }
  }

  /**
   * Record a new analysis request
   */
  async recordAnalysisRequest(
    analysisId: string,
    projectId: string,
    status: string,
    analysisTypes: string[],
    requestData?: any,
    resultData?: any,
    error?: string,
    executionTimeMs?: number
  ): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO analysis_requests 
        (analysis_id, project_id, status, analysis_types, request_data, result_data, error, execution_time_ms, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const completedAt = status === 'completed' || status === 'failed' 
        ? new Date().toISOString() 
        : null;

      const { meta } = await stmt.bind(
        analysisId,
        projectId,
        status,
        Array.isArray(analysisTypes) ? analysisTypes.join(',') : analysisTypes,
        requestData ? JSON.stringify(requestData) : null,
        resultData ? JSON.stringify(resultData) : null,
        error || null,
        executionTimeMs || null,
        completedAt
      ).run();

      return meta.last_row_id;
    } catch (error: unknown) {
      this.logger.error(`Error recording analysis request: ${getErrorMessage(error)}`, { error });
      throw error;
    }
  }

  /**
   * Record an agent execution
   */
  async recordAgentExecution(
    agentType: string,
    status: string,
    workflowExecutionId?: number,
    analysisRequestId?: number,
    confidence?: number,
    inputData?: any,
    outputData?: any,
    error?: string,
    executionTimeMs?: number
  ): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO agent_executions 
        (agent_type, status, workflow_execution_id, analysis_request_id, confidence, input_data, output_data, error, execution_time_ms, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const completedAt = status === 'completed' || status === 'failed' 
        ? new Date().toISOString() 
        : null;

      const { meta } = await stmt.bind(
        agentType,
        status,
        workflowExecutionId || null,
        analysisRequestId || null,
        confidence || null,
        inputData ? JSON.stringify(inputData) : null,
        outputData ? JSON.stringify(outputData) : null,
        error || null,
        executionTimeMs || null,
        completedAt
      ).run();

      return meta.last_row_id;
    } catch (error: unknown) {
      this.logger.error(`Error recording agent execution: ${getErrorMessage(error)}`, { error });
      throw error;
    }
  }

  /**
   * Update a workflow execution status
   */
  async updateWorkflowExecution(
    id: number,
    status: string,
    outputData?: any,
    error?: string,
    executionTimeMs?: number
  ): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE workflow_executions
        SET status = ?, output_data = ?, error = ?, execution_time_ms = ?, completed_at = ?
        WHERE id = ?
      `);

      const completedAt = status === 'completed' || status === 'failed' 
        ? new Date().toISOString() 
        : null;

      await stmt.bind(
        status,
        outputData ? JSON.stringify(outputData) : null,
        error || null,
        executionTimeMs || null,
        completedAt,
        id
      ).run();
    } catch (error: unknown) {
      this.logger.error(`Error updating workflow execution: ${getErrorMessage(error)}`, { error });
      throw error;
    }
  }

  /**
   * Update an analysis request status
   */
  async updateAnalysisRequest(
    analysisId: string,
    status: string,
    resultData?: any,
    error?: string,
    executionTimeMs?: number
  ): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        UPDATE analysis_requests
        SET status = ?, result_data = ?, error = ?, execution_time_ms = ?, completed_at = ?
        WHERE analysis_id = ?
      `);

      const completedAt = status === 'completed' || status === 'failed' 
        ? new Date().toISOString() 
        : null;

      await stmt.bind(
        status,
        resultData ? JSON.stringify(resultData) : null,
        error || null,
        executionTimeMs || null,
        completedAt,
        analysisId
      ).run();
    } catch (error: unknown) {
      this.logger.error(`Error updating analysis request: ${getErrorMessage(error)}`, { error });
      throw error;
    }
  }

  /**
   * Get a workflow execution by ID
   */
  async getWorkflowExecution(id: number): Promise<any> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM workflow_executions WHERE id = ?
      `);

      const { results } = await stmt.bind(id).all();
      
      if (results.length === 0) {
        return null;
      }

      const result = results[0];
      
      // Parse JSON fields
      if (result.input_data) {
        result.input_data = JSON.parse(result.input_data as string);
      }
      
      if (result.output_data) {
        result.output_data = JSON.parse(result.output_data as string);
      }

      return result;
    } catch (error: unknown) {
      this.logger.error(`Error getting workflow execution: ${getErrorMessage(error)}`, { error });
      throw error;
    }
  }

  /**
   * Get an analysis request by ID
   */
  async getAnalysisRequest(analysisId: string): Promise<any> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM analysis_requests WHERE analysis_id = ?
      `);

      const { results } = await stmt.bind(analysisId).all();
      
      if (results.length === 0) {
        return null;
      }

      const result = results[0];
      
      // Parse JSON fields
      if (result.request_data) {
        result.request_data = JSON.parse(result.request_data as string);
      }
      
      if (result.result_data) {
        result.result_data = JSON.parse(result.result_data as string);
      }

      // Convert analysis_types back to array
      if (result.analysis_types) {
        result.analysis_types = (result.analysis_types as string).split(',');
      }

      return result;
    } catch (error: unknown) {
      this.logger.error(`Error getting analysis request: ${getErrorMessage(error)}`, { error });
      throw error;
    }
  }

  /**
   * Get agent executions for a workflow or analysis
   */
  async getAgentExecutions(options: { workflowExecutionId?: number, analysisRequestId?: number }): Promise<any[]> {
    try {
      let query = `SELECT * FROM agent_executions WHERE `;
      let bindValues: any[] = [];
      
      if (options.workflowExecutionId) {
        query += `workflow_execution_id = ?`;
        bindValues.push(options.workflowExecutionId);
      } else if (options.analysisRequestId) {
        query += `analysis_request_id = ?`;
        bindValues.push(options.analysisRequestId);
      } else {
        throw new Error('Either workflowExecutionId or analysisRequestId must be provided');
      }

      const stmt = this.db.prepare(query);
      const { results } = await stmt.bind(...bindValues).all();
      
      // Parse JSON fields in results
      return results.map(result => {
        if (result.input_data) {
          result.input_data = JSON.parse(result.input_data as string);
        }
        
        if (result.output_data) {
          result.output_data = JSON.parse(result.output_data as string);
        }
        
        return result;
      });
    } catch (error: unknown) {
      this.logger.error(`Error getting agent executions: ${getErrorMessage(error)}`, { error });
      throw error;
    }
  }
} 