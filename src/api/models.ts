import { z } from 'zod';
import { AnalysisType, PriorityLevel } from '../config/agent-config';

// Base schema for query parameters
export const QueryParamsSchema = z.object({}).catchall(z.any());

// Schema for analysis request
export const AnalysisRequestSchema = z.object({
  projectId: z.string().min(1),
  analysisTypes: z.array(z.nativeEnum(AnalysisType)).min(1),
  queryParams: QueryParamsSchema.optional(),
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
  priority: z.nativeEnum(PriorityLevel).default(PriorityLevel.MEDIUM),
  timeout: z.number().int().positive().default(60),
  streaming: z.boolean().default(false),
});

// Schema for analysis response
export const AnalysisResponseSchema = z.object({
  success: z.boolean(),
  restaurantId: z.string(),
  analysisTypes: z.array(z.nativeEnum(AnalysisType)),
  timestamp: z.string().datetime(),
  executionTime: z.number(),
  results: z.record(z.any()),
  metadata: z.record(z.any()).optional(),
});

// Schema for analysis status
export const AnalysisStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number().min(0).max(1),
  completedTypes: z.array(z.nativeEnum(AnalysisType)),
  currentType: z.nativeEnum(AnalysisType).nullable(),
  results: z.record(z.any()).optional(),
  executionTime: z.number().optional(),
  error: z.string().optional(),
});

// Schema for error response
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.any()).optional(),
});

// Type definitions based on schemas
export type QueryParams = z.infer<typeof QueryParamsSchema>;
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>; 