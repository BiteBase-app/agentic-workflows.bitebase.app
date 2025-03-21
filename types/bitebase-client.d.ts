/**
 * Type definitions for the BiteBase client
 */

declare module '@bitebase/client' {
  export interface Project {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface Bite {
    id: string;
    projectId: string;
    title: string;
    content?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
  }

  export interface CreateBiteParams {
    projectId: string;
    title: string;
    content?: string;
    metadata?: Record<string, any>;
  }

  export interface UpdateBiteParams {
    title?: string;
    content?: string;
    metadata?: Record<string, any>;
  }

  export interface IntegrationData {
    apiVersion: string;
    usage: {
      bites: number;
      projects: number;
    };
    features: string[];
  }

  export class BitesClient {
    constructor(apiKey: string, options?: Record<string, any>);
    
    // Projects
    listProjects(): Promise<Project[]>;
    getProject(projectId: string): Promise<Project>;
    
    // Bites
    listBites(projectId: string): Promise<Bite[]>;
    getBite(biteId: string): Promise<Bite>;
    createBite(params: CreateBiteParams): Promise<Bite>;
    updateBite(biteId: string, params: UpdateBiteParams): Promise<Bite>;
    
    // Integration
    getIntegrationData(): Promise<IntegrationData>;
  }

  export type BiteBaseClient = BitesClient;
} 