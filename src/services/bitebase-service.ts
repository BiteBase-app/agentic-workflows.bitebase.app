/**
 * BiteBase Integration Service
 * 
 * Provides integration with the BiteBase API system
 */

import logger from '../utils/logger';
import { config } from '../config/environment';

export interface BiteBaseClient {
  getApiInfo(): Promise<any>;
  getHealthStatus(): Promise<any>;
  analyzeProject(request: any): Promise<any>;
  getAnalysisStatus(analysisId: string): Promise<any>;
  pollAnalysisUntilComplete(analysisId: string, interval?: number, timeout?: number): Promise<any>;
}

export class BiteBaseService {
  private bitebaseClient: BiteBaseClient | null = null;
  private logger = logger.child({ service: 'BiteBaseService' });

  /**
   * Create a new BiteBase service
   */
  constructor(bitebaseClient?: BiteBaseClient) {
    this.bitebaseClient = bitebaseClient || null;
    
    if (!this.bitebaseClient) {
      this.logger.warn('BiteBase client not provided. Service will attempt to load it dynamically.');
    }
  }

  /**
   * Initialize BiteBase client from src/bitebaseClient.ts if available
   */
  async initialize(): Promise<boolean> {
    if (this.bitebaseClient) {
      return true;
    }

    try {
      // Try to dynamically import the BiteBase client
      // This assumes it's deployed alongside our Cloudflare worker
      const { createBiteBaseClient } = await import('../bitebaseClient');
      
      if (createBiteBaseClient) {
        const baseUrl = process.env.BITEBASE_API_URL || 'https://api.bitebase.io';
        const apiKey = process.env.BITEBASE_API_KEY;
        
        this.bitebaseClient = createBiteBaseClient(baseUrl, apiKey);
        this.logger.info('BiteBase client initialized successfully');
        return true;
      }
      
      this.logger.warn('BiteBase client import failed - createBiteBaseClient not found');
      return false;
    } catch (error) {
      this.logger.error(`Failed to initialize BiteBase client: ${error.message}`, { error });
      return false;
    }
  }

  /**
   * Get BiteBase API information
   */
  async getApiInfo(): Promise<any> {
    await this.ensureInitialized();
    return this.bitebaseClient!.getApiInfo();
  }

  /**
   * Get BiteBase health status
   */
  async getHealthStatus(): Promise<any> {
    await this.ensureInitialized();
    return this.bitebaseClient!.getHealthStatus();
  }

  /**
   * Forward analysis to BiteBase
   */
  async forwardAnalysis(request: any): Promise<any> {
    await this.ensureInitialized();
    return this.bitebaseClient!.analyzeProject(request);
  }

  /**
   * Get analysis status from BiteBase
   */
  async getAnalysisStatus(analysisId: string): Promise<any> {
    await this.ensureInitialized();
    return this.bitebaseClient!.getAnalysisStatus(analysisId);
  }

  /**
   * Poll until analysis is complete
   */
  async pollAnalysisUntilComplete(
    analysisId: string,
    interval = 1000,
    timeout = 60000
  ): Promise<any> {
    await this.ensureInitialized();
    return this.bitebaseClient!.pollAnalysisUntilComplete(analysisId, interval, timeout);
  }

  /**
   * Verify the BiteBase client is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.bitebaseClient) {
      const success = await this.initialize();
      if (!success) {
        throw new Error('BiteBase client not initialized');
      }
    }
  }
} 