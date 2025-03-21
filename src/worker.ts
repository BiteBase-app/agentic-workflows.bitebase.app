import { createServer } from 'node:http';
import { D1Database } from '@cloudflare/workers-types';
import express from 'express';
import { config } from './config/environment';
import logger from './utils/logger';
import { AgentType, AgentCapability, ResultAggregationMethod, AnalysisType, PriorityLevel } from './config/agent-config';
import { SentimentAgent } from './agents/sentiment-agent';
import { AgentOrchestrator } from './orchestration/orchestrator';
import { CustomerSupportWorkflow } from './workflows/workflow';
import app from './app';
import { BiteBaseService } from './services/bitebase-service';

// Cloudflare Worker environment interface
export interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
  ENVIRONMENT: string;
  BITEBASE_API_URL?: string;
  BITEBASE_API_KEY?: string;
}

// Initialize agents and orchestrator
const initializeAgents = async (env: Env) => {
  try {
    // Override API key from Cloudflare environment
    if (env.OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
    }

    // Override environment settings
    if (env.ENVIRONMENT) {
      process.env.NODE_ENV = env.ENVIRONMENT;
    }

    // Set BiteBase environment variables
    if (env.BITEBASE_API_URL) {
      process.env.BITEBASE_API_URL = env.BITEBASE_API_URL;
    }
    
    if (env.BITEBASE_API_KEY) {
      process.env.BITEBASE_API_KEY = env.BITEBASE_API_KEY;
    }

    // Initialize sentiment agent
    const sentimentAgent = new SentimentAgent({
      enabled: true,
      capabilities: [AgentCapability.SENTIMENT_ANALYSIS],
      model: config.openai.model,
      temperature: 0.7,
      maxTokens: 2000,
      contextWindow: 16000,
      memoryEnabled: true,
      usesTools: true,
      timeout: config.agent.timeout,
      maxRetries: config.agent.maxRetries,
      priority: PriorityLevel.MEDIUM,
      type: AgentType.SENTIMENT
    });
    
    // Create agent map
    const agents = new Map();
    agents.set(AgentType.SENTIMENT, sentimentAgent);
    
    // Initialize orchestrator
    const orchestrator = new AgentOrchestrator(
      {
        maxConcurrentAgents: config.agent.maxConcurrentAgents,
        agentTimeout: config.agent.timeout,
        maxRetries: config.agent.maxRetries,
        resultAggregation: ResultAggregationMethod.SIMPLE,
        cacheEnabled: config.cache.enabled,
        cacheTTL: config.cache.ttl,
        priorityEnabled: true,
        analyzeByDefault: [AnalysisType.SENTIMENT],
      },
      agents
    );
    
    await orchestrator.initialize();
    
    return orchestrator;
  } catch (error) {
    logger.error('Failed to initialize agents', { error });
    throw error;
  }
};

// Initialize workflows
const initializeWorkflows = () => {
  try {
    const customerSupportWorkflow = new CustomerSupportWorkflow();
    
    return {
      customerSupport: customerSupportWorkflow,
    };
  } catch (error) {
    logger.error('Failed to initialize workflows', { error });
    throw error;
  }
};

// Cloudflare Worker entry point
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Initialize orchestrator and workflows
      const orchestrator = await initializeAgents(env);
      const workflows = initializeWorkflows();
      
      // Initialize BiteBase service
      const bitebaseService = new BiteBaseService();
      await bitebaseService.initialize();
      
      // Setup Express app context with D1 database
      app.locals.db = env.DB;
      app.locals.orchestrator = orchestrator;
      app.locals.workflows = workflows;
      app.locals.bitebaseService = bitebaseService;

      // Handle the request using Express
      const server = createServer(app);
      
      // Create a promise that resolves with the response
      return new Promise((resolve) => {
        // Mock response object
        const response = new ResponseBuffer();
        
        // Create fake req/res objects to pass to Express
        const fakeRes = createFakeResponse(response, () => {
          // When response is finished, resolve with the Cloudflare Response
          resolve(new Response(response.buffer, {
            status: response.statusCode,
            headers: response.headers,
          }));
        });
        
        // Pass the request to Express
        app(createFakeRequest(request), fakeRes);
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
  
  // Scheduled task handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    logger.info('Running scheduled task', { cron: event.cron });
    
    // Initialize components
    const orchestrator = await initializeAgents(env);
    
    // Perform maintenance tasks
    try {
      // Cleanup expired cache entries
      await orchestrator.cleanup();
      
      logger.info('Scheduled maintenance completed successfully');
    } catch (error) {
      logger.error('Scheduled maintenance failed', { error });
    }
  }
};

// Utility classes for adapting Express to Cloudflare Workers

// Buffer to collect response data
class ResponseBuffer {
  buffer: Uint8Array | string = '';
  statusCode: number = 200;
  headers: Headers = new Headers();
  
  write(chunk: string | Uint8Array): void {
    if (typeof this.buffer === 'string' && typeof chunk === 'string') {
      this.buffer += chunk;
    } else {
      // Convert to Uint8Array if needed
      const newBuffer = typeof this.buffer === 'string' 
        ? new TextEncoder().encode(this.buffer)
        : this.buffer;
      
      const chunkBuffer = typeof chunk === 'string'
        ? new TextEncoder().encode(chunk)
        : chunk;
      
      // Concatenate the buffers
      const combinedBuffer = new Uint8Array(newBuffer.length + chunkBuffer.length);
      combinedBuffer.set(newBuffer, 0);
      combinedBuffer.set(chunkBuffer, newBuffer.length);
      
      this.buffer = combinedBuffer;
    }
  }
  
  end(chunk?: string | Uint8Array): void {
    if (chunk) {
      this.write(chunk);
    }
  }
}

// Create a fake Express response object
function createFakeResponse(buffer: ResponseBuffer, onFinish: () => void): express.Response {
  const res: any = {
    statusCode: 200,
    headersSent: false,
    
    status(code: number) {
      buffer.statusCode = code;
      return res;
    },
    
    setHeader(name: string, value: string) {
      buffer.headers.set(name, value);
      return res;
    },
    
    getHeader(name: string) {
      return buffer.headers.get(name);
    },
    
    removeHeader(name: string) {
      buffer.headers.delete(name);
      return res;
    },
    
    write(chunk: string | Uint8Array) {
      buffer.write(chunk);
      return true;
    },
    
    end(chunk?: string | Uint8Array) {
      if (chunk) {
        buffer.write(chunk);
      }
      onFinish();
      return res;
    },
    
    json(body: any) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
      return res;
    },
    
    send(body: any) {
      if (typeof body === 'string') {
        if (!res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', 'text/html');
        }
        res.end(body);
      } else if (Buffer.isBuffer(body)) {
        if (!res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', 'application/octet-stream');
        }
        res.end(body);
      } else {
        return res.json(body);
      }
      return res;
    },
    
    // Add other Express response methods as needed
  };
  
  return res as express.Response;
}

// Create a fake Express request object from a Cloudflare Request
function createFakeRequest(request: Request): express.Request {
  const url = new URL(request.url);
  
  const req: any = {
    method: request.method,
    url: url.pathname + url.search,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(request.headers),
    body: {},  // Will be populated by body parsing middleware
    
    get(header: string) {
      return request.headers.get(header);
    },
    
    // Add other Express request methods as needed
  };
  
  return req as express.Request;
} 