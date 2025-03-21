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