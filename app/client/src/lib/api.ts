// API Client for SABE Frontend
// Leverages types from @sabe/shared for consistency

import type {
  CreateProviderInput,
  UpdateProviderInput,
  CreateModelInput,
  UpdateModelInput,
  UpdateModelStatusInput,
  CreateQuestionInput,
  UpdateQuestionInput,
  CreateQuestionTypeInput,
  UpdateQuestionTypeInput,
  BenchmarkRunOptions,
  BenchmarkProgress,
  BenchmarkRunSummary,
  TaskExecutionResult,
  RankingsResponse,
  RankingsByTypeResponse,
  TemporalComparison,
  ModelTrend,
  QuestionTypeInfo,
  ComparisonPeriod,
  LLMResponse,
} from '@sabe/shared';

const API_BASE = '/api';

// Generic API fetch with error handling
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Entity types from database (not in shared, but returned by API)
export interface Provider {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKeyEnvVar: string;
  status: 'active' | 'inactive';
  rateLimitPerMinute: number | null;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Model {
  id: string;
  providerId: string;
  providerModelId: string;
  displayName: string;
  label: string | null;
  status: 'active' | 'inactive' | 'deprecated';
  contextSize: number | null;
  costInputPerMillion: number | null;
  costOutputPerMillion: number | null;
  config: { temperature?: number; maxTokens?: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionType {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  createdAt: string;
}

export interface Question {
  id: string;
  typeId: string;
  content: string;
  expectedAnswer: string | null;
  evaluationMethod: 'exact_match' | 'contains' | 'regex' | 'llm_judge';
  evaluationCriteria: { pattern?: string; keywords?: string[]; rubric?: string } | null;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  weight: number;
  status: 'active' | 'archived';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface BenchmarkRun {
  id: string;
  iterationNumber: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string | null;
  completedAt: string | null;
  modelsCount: number;
  questionsCount: number;
  errorLog: string | null;
  createdAt: string;
}

export interface LLMModelInfo {
  id: string;
  name: string;
  contextLength?: number;
  pricing?: { prompt?: number; completion?: number };
}

export interface ProviderStatus {
  id: string;
  name: string;
  registered: boolean;
  apiEndpoint: string;
  rateLimitPerMinute: number | null;
}

// Providers API
export const providersApi = {
  list: () => fetchApi<{ data: Provider[] }>('/providers'),
  get: (id: string) => fetchApi<{ data: Provider }>(`/providers/${id}`),
  create: (data: CreateProviderInput) =>
    fetchApi<{ data: Provider }>('/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateProviderInput) =>
    fetchApi<{ data: Provider }>(`/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) => fetchApi<void>(`/providers/${id}`, { method: 'DELETE' }),
  test: (id: string) =>
    fetchApi<{ data: { connected: boolean; responseTimeMs: number } }>(
      `/llm/providers/${id}/test`
    ),
  listModels: (id: string) =>
    fetchApi<{ data: { providerId: string; providerName: string; models: LLMModelInfo[]; count: number } }>(
      `/llm/providers/${id}/models`
    ),
  reload: (id: string) =>
    fetchApi<{ data: { registered: boolean } }>(`/llm/providers/${id}/reload`, {
      method: 'POST',
    }),
};

// Models API
export const modelsApi = {
  list: (filters?: { providerId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.providerId) params.set('providerId', filters.providerId);
    if (filters?.status) params.set('status', filters.status);
    const query = params.toString();
    return fetchApi<{ data: Model[] }>(`/models${query ? `?${query}` : ''}`);
  },
  get: (id: string) => fetchApi<{ data: Model }>(`/models/${id}`),
  create: (data: CreateModelInput) =>
    fetchApi<{ data: Model }>('/models', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateModelInput) =>
    fetchApi<{ data: Model }>(`/models/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, status: UpdateModelStatusInput['status']) =>
    fetchApi<{ data: Model }>(`/models/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  delete: (id: string) => fetchApi<void>(`/models/${id}`, { method: 'DELETE' }),
};

// Questions API
export const questionsApi = {
  list: (filters?: { typeId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.typeId) params.set('typeId', filters.typeId);
    if (filters?.status) params.set('status', filters.status);
    const query = params.toString();
    return fetchApi<{ data: Question[] }>(`/questions${query ? `?${query}` : ''}`);
  },
  get: (id: string) => fetchApi<{ data: Question }>(`/questions/${id}`),
  create: (data: CreateQuestionInput) =>
    fetchApi<{ data: Question }>('/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateQuestionInput) =>
    fetchApi<{ data: Question }>(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) => fetchApi<void>(`/questions/${id}`, { method: 'DELETE' }),
};

// Question Types API
export const questionTypesApi = {
  list: () => fetchApi<{ data: QuestionType[] }>('/questions/types'),
  get: (id: string) => fetchApi<{ data: QuestionType }>(`/questions/types/${id}`),
  create: (data: CreateQuestionTypeInput) =>
    fetchApi<{ data: QuestionType }>('/questions/types', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateQuestionTypeInput) =>
    fetchApi<{ data: QuestionType }>(`/questions/types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) => fetchApi<void>(`/questions/types/${id}`, { method: 'DELETE' }),
};

// Runs API
export const runsApi = {
  list: (params?: { limit?: number; offset?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return fetchApi<{ data: BenchmarkRun[]; pagination: { limit: number; offset: number; total: number } }>(
      `/runs${query ? `?${query}` : ''}`
    );
  },
  get: (id: string) => fetchApi<{ data: BenchmarkRun }>(`/runs/${id}`),
  getProgress: (id: string) => fetchApi<{ data: BenchmarkProgress }>(`/runs/${id}/progress`),
  getSummary: (id: string) => fetchApi<{ data: BenchmarkRunSummary }>(`/runs/${id}/summary`),
  getResults: (id: string) => fetchApi<{ data: TaskExecutionResult[] }>(`/runs/${id}/results`),
  start: (options?: BenchmarkRunOptions) =>
    fetchApi<{ message: string; runId: string }>('/runs', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),
  cancel: (id: string) => fetchApi<{ message: string }>(`/runs/${id}/cancel`, { method: 'POST' }),
};

// Rankings API
export const rankingsApi = {
  getLatest: () => fetchApi<RankingsResponse>('/rankings/latest'),
  getTypes: () => fetchApi<{ data: QuestionTypeInfo[] }>('/rankings/types'),
  getByType: (type: string) => fetchApi<RankingsByTypeResponse>(`/rankings/by-type/${type}`),
  compare: (period: ComparisonPeriod) =>
    fetchApi<{ data: TemporalComparison[]; period: string }>(`/rankings/compare/${period}`),
  getHistory: (modelId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return fetchApi<{ data: ModelTrend }>(`/rankings/history/${modelId}${query}`);
  },
  getTrends: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return fetchApi<{ data: ModelTrend[] }>(`/rankings/trends${query}`);
  },
  getByRun: (runId: string) => fetchApi<RankingsResponse>(`/rankings/run/${runId}`),
};

// LLM API
export const llmApi = {
  status: () =>
    fetchApi<{ data: { providers: ProviderStatus[]; totalActive: number; totalRegistered: number } }>(
      '/llm/status'
    ),
  testPrompt: (params: { providerId: string; prompt: string; model?: string; temperature?: number; maxTokens?: number }) =>
    fetchApi<{ data: LLMResponse & { model: string; providerId: string } }>('/llm/test', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};

// Health API
export const healthApi = {
  check: () => fetchApi<{ data: { status: 'ok' | 'error'; timestamp: string; version: string } }>('/health'),
};

// Re-export shared types for convenience
export type {
  CreateProviderInput,
  UpdateProviderInput,
  CreateModelInput,
  UpdateModelInput,
  UpdateModelStatusInput,
  CreateQuestionInput,
  UpdateQuestionInput,
  CreateQuestionTypeInput,
  UpdateQuestionTypeInput,
  BenchmarkRunOptions,
  BenchmarkProgress,
  BenchmarkRunSummary,
  TaskExecutionResult,
  RankingsResponse,
  RankingsByTypeResponse,
  TemporalComparison,
  ModelTrend,
  QuestionTypeInfo,
  ComparisonPeriod,
};
