// Type definitions for Cloudflare Worker environment

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
  noRetry?: boolean;
}

// Extend Express types to include locals
declare namespace Express {
  interface Application {
    locals: {
      db?: D1Database;
      dbService?: any;
      orchestrator?: any;
      workflows?: Record<string, any>;
      bitebaseService?: any;
    };
  }
}

declare global {
  // Add D1 database type for Cloudflare Workers
  var DB: D1Database;
  var ENV: any;
  
  // Express app with locals
  namespace Express {
    interface Application {
      locals: {
        orchestrator: any;
        workflowRegistry: any;
        dbService: any;
        biteBaseService: any;
      }
    }
  }
} 