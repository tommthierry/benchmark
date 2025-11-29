// SABE Shared - Types, Constants, and Schemas
// This package is shared between server and client

export const APP_NAME = 'SABE';
export const APP_VERSION = '0.1.0';

// API Response Types
export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
}

// Standard API response wrapper
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

// Re-export all schemas
export * from './schemas/index.js';

// Re-export LLM types
export * from './types/llm.js';

// Re-export Benchmark types
export * from './types/benchmark.js';

// Re-export Ranking types
export * from './types/ranking.js';
