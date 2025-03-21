/**
 * BiteBase Client Implementation
 * 
 * Provides integration with the BiteBase API system
 */

import axios from 'axios';
import logger from './utils/logger';
import { BiteBaseClient } from './services/bitebase-service';

/**
 * Creates a BiteBase client that integrates with the BiteBase API
 * @param baseUrl The base URL of the BiteBase API
 * @param apiKey Optional API key for authenticated requests
 * @returns A configured BiteBase client
 */
export function createBiteBaseClient(baseUrl: string, apiKey?: string): BiteBaseClient {
  const log = logger.child({ service: 'BiteBaseClient' });
  
  // Create axios instance with common configuration
  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
    },
    timeout: 30000
  });

  return {
    async getApiInfo(): Promise<any> {
      try {
        const response = await client.get('/');
        return response.data;
      } catch (error) {
        log.error('Failed to get API info', { error });
        throw error;
      }
    },

    async getHealthStatus(): Promise<any> {
      try {
        const response = await client.get('/health');
        return response.data;
      } catch (error) {
        log.error('Failed to get health status', { error });
        throw error;
      }
    },

    async analyzeProject(request: any): Promise<any> {
      try {
        const response = await client.post('/analyze', request);
        return response.data;
      } catch (error) {
        log.error('Failed to analyze project', { error });
        throw error;
      }
    },

    async getAnalysisStatus(analysisId: string): Promise<any> {
      try {
        const response = await client.get(`/analyze/status/${analysisId}`);
        return response.data;
      } catch (error) {
        log.error('Failed to get analysis status', { error, analysisId });
        throw error;
      }
    },

    async pollAnalysisUntilComplete(
      analysisId: string, 
      interval = 1000, 
      timeout = 60000
    ): Promise<any> {
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        try {
          const status = await this.getAnalysisStatus(analysisId);
          
          if (status.status === 'completed' || status.status === 'failed') {
            return status;
          }
          
          // Wait for the specified interval
          await new Promise(resolve => setTimeout(resolve, interval));
        } catch (error) {
          log.error('Error during polling for analysis status', { error, analysisId });
          throw error;
        }
      }
      
      throw new Error(`Analysis polling timed out after ${timeout}ms`);
    }
  };
} 