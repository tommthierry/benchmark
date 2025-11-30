# PHASE 5: Frontend

**Status:** ✅ COMPLETED
**Goal:** React dashboard with rankings, charts, AND admin UI for managing all entities
**Completed:** 2025-11-29
**Prerequisites:** Phase 4 completed

---

## Phase Objectives

By the end of this phase:
1. ✅ TanStack Query setup for data fetching
2. ✅ Zustand store for UI state
3. ✅ Main layout with navigation (User + Admin sections)
4. ✅ Rankings dashboard with table and charts
5. ✅ Run history and details view
6. ✅ **Admin Section**: Full CRUD for Providers, Models, Questions, Question Types
7. ✅ Responsive design with TailwindCSS

---

## Architecture: Admin-First Approach

SABE follows an **admin-first** philosophy where all core entities can be managed through the UI:

```
┌─────────────────────────────────────────────────────────────┐
│                        SABE Frontend                         │
├─────────────────────────────────────────────────────────────┤
│  USER SECTION (Public Dashboard)                             │
│  ├── Rankings Dashboard   - View current LLM rankings        │
│  ├── Run History         - View past benchmark runs          │
│  └── Model Comparison    - Compare model performance         │
├─────────────────────────────────────────────────────────────┤
│  ADMIN SECTION (Management)                                  │
│  ├── Providers           - Add/Edit/Delete LLM providers     │
│  ├── Models              - Add/Edit/Delete/Import models     │
│  ├── Questions           - Add/Edit/Delete benchmark prompts │
│  ├── Question Types      - Manage question categories        │
│  ├── Run Configuration   - Start/configure benchmark runs    │
│  └── Settings            - System configuration              │
└─────────────────────────────────────────────────────────────┘
```

### What Can Be Managed via Admin UI

| Entity | Operations | Notes |
|--------|------------|-------|
| **Providers** | Create, Read, Update, Delete | OpenRouter is default; can add others |
| **Models** | Create, Read, Update, Delete, Toggle Status, Import | Import from provider API |
| **Questions** | Create, Read, Update, Delete, Version | Content + evaluation criteria |
| **Question Types** | Create, Read, Update, Delete | Categories like "reasoning", "code" |
| **Benchmark Runs** | Start, Monitor, Cancel | Select models/questions subset |

---

## Progress Tracker

| Step | Description | Status | Notes |
|------|-------------|--------|-------|
| 5.1 | Install frontend dependencies | ✅ COMPLETED | react-router, tanstack-query, zustand, echarts, lucide |
| 5.2 | Setup TanStack Query provider | ✅ COMPLETED | QueryClient + BrowserRouter in main.tsx |
| 5.3 | Create Zustand stores | ✅ COMPLETED | uiStore with persist middleware |
| 5.4 | Create layout with dual navigation | ✅ COMPLETED | User + Admin mode toggle |
| 5.5 | Build rankings dashboard | ✅ COMPLETED | Table with scores, position changes |
| 5.6 | Create rankings chart | ✅ COMPLETED | ECharts line chart for trends |
| 5.7 | Build run history page | ✅ COMPLETED | List with progress, summary, cancel |
| 5.8 | **Build Admin: Providers page** | ✅ COMPLETED | Full CRUD + test connectivity |
| 5.9 | **Build Admin: Models page** | ✅ COMPLETED | CRUD + Import from provider API |
| 5.10 | **Build Admin: Questions page** | ✅ COMPLETED | Full CRUD with eval criteria |
| 5.11 | **Build Admin: Question Types page** | ✅ COMPLETED | Full CRUD |
| 5.12 | Build Settings page | ✅ COMPLETED | System status, provider status, DB stats |
| 5.13 | Test all pages | ✅ COMPLETED | TypeScript compiles, APIs verified |

---

## Step 5.1: Install Frontend Dependencies

Update `/app/client/package.json`:

```json
{
  "name": "@sabe/client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@tanstack/react-query": "^5.60.0",
    "@tanstack/react-table": "^8.20.0",
    "zustand": "^5.0.0",
    "echarts": "^5.5.0",
    "echarts-for-react": "^3.0.0",
    "lucide-react": "^0.460.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

Run:
```bash
cd app/client && npm install
```

---

## Step 5.2: Setup TanStack Query Provider

Update `/app/client/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
```

Create `/app/client/src/lib/api.ts`:

```typescript
const API_BASE = '/api';

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
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

// ============================================================================
// PROVIDERS API
// ============================================================================
export const providersApi = {
  list: () => fetchApi<{ data: Provider[] }>('/providers'),
  get: (id: string) => fetchApi<{ data: Provider }>(`/providers/${id}`),
  create: (data: CreateProvider) =>
    fetchApi<{ data: Provider }>('/providers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateProvider) =>
    fetchApi<{ data: Provider }>(`/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/providers/${id}`, { method: 'DELETE' }),
  test: (id: string) =>
    fetchApi<{ data: { connected: boolean; responseTimeMs: number } }>(
      `/llm/providers/${id}/test`
    ),
  listModels: (id: string) =>
    fetchApi<{ data: { models: LLMModelInfo[]; count: number } }>(
      `/llm/providers/${id}/models`
    ),
  reload: (id: string) =>
    fetchApi<{ data: { registered: boolean } }>(`/llm/providers/${id}/reload`, {
      method: 'POST',
    }),
};

// ============================================================================
// MODELS API
// ============================================================================
export const modelsApi = {
  list: (filters?: { providerId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.providerId) params.set('providerId', filters.providerId);
    if (filters?.status) params.set('status', filters.status);
    const query = params.toString();
    return fetchApi<{ data: Model[] }>(`/models${query ? `?${query}` : ''}`);
  },
  get: (id: string) => fetchApi<{ data: Model }>(`/models/${id}`),
  create: (data: CreateModel) =>
    fetchApi<{ data: Model }>('/models', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateModel) =>
    fetchApi<{ data: Model }>(`/models/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, status: 'active' | 'inactive' | 'deprecated') =>
    fetchApi<{ data: Model }>(`/models/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/models/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// QUESTIONS API
// ============================================================================
export const questionsApi = {
  list: (filters?: { typeId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.typeId) params.set('typeId', filters.typeId);
    if (filters?.status) params.set('status', filters.status);
    const query = params.toString();
    return fetchApi<{ data: Question[] }>(`/questions${query ? `?${query}` : ''}`);
  },
  get: (id: string) => fetchApi<{ data: Question }>(`/questions/${id}`),
  create: (data: CreateQuestion) =>
    fetchApi<{ data: Question }>('/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateQuestion) =>
    fetchApi<{ data: Question }>(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/questions/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// QUESTION TYPES API
// ============================================================================
export const questionTypesApi = {
  list: () => fetchApi<{ data: QuestionType[] }>('/questions/types'),
  get: (id: string) => fetchApi<{ data: QuestionType }>(`/questions/types/${id}`),
  create: (data: CreateQuestionType) =>
    fetchApi<{ data: QuestionType }>('/questions/types', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateQuestionType) =>
    fetchApi<{ data: QuestionType }>(`/questions/types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<void>(`/questions/types/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// RUNS API
// ============================================================================
export const runsApi = {
  list: () => fetchApi<{ data: Run[] }>('/runs'),
  get: (id: string) => fetchApi<{ data: Run }>(`/runs/${id}`),
  getProgress: (id: string) => fetchApi<{ data: RunProgress }>(`/runs/${id}/progress`),
  getResults: (id: string) => fetchApi<{ data: TaskExecution[] }>(`/runs/${id}/results`),
  start: (options?: RunOptions) =>
    fetchApi<{ runId: string }>('/runs', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),
  cancel: (id: string) =>
    fetchApi<void>(`/runs/${id}/cancel`, { method: 'POST' }),
};

// ============================================================================
// RANKINGS API
// ============================================================================
export const rankingsApi = {
  getLatest: () => fetchApi<{ data: Ranking[]; run: Run | null }>('/rankings/latest'),
  getByType: (type: string) => fetchApi<{ data: Ranking[] }>(`/rankings/by-type/${type}`),
  compare: (period: string) => fetchApi<{ data: Comparison[] }>(`/rankings/compare/${period}`),
  getTrends: () => fetchApi<{ data: ModelTrend[] }>('/rankings/trends'),
  getHistory: (modelId: string) => fetchApi<{ data: ModelTrend }>(`/rankings/history/${modelId}`),
};

// ============================================================================
// LLM API
// ============================================================================
export const llmApi = {
  status: () => fetchApi<{ data: { providers: ProviderStatus[]; totalActive: number; totalRegistered: number } }>('/llm/status'),
  testPrompt: (providerId: string, prompt: string, model?: string) =>
    fetchApi<{ data: LLMTestResponse }>('/llm/test', {
      method: 'POST',
      body: JSON.stringify({ providerId, prompt, model }),
    }),
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Provider types
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

export interface CreateProvider {
  name: string;
  apiEndpoint: string;
  apiKeyEnvVar: string;
  status?: 'active' | 'inactive';
  rateLimitPerMinute?: number;
  config?: Record<string, unknown>;
}

export interface UpdateProvider extends Partial<CreateProvider> {}

export interface ProviderStatus {
  id: string;
  name: string;
  registered: boolean;
  apiEndpoint: string;
  rateLimitPerMinute: number | null;
}

// Model types
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

export interface CreateModel {
  providerId: string;
  providerModelId: string;
  displayName: string;
  label?: string;
  status?: 'active' | 'inactive' | 'deprecated';
  contextSize?: number;
  costInputPerMillion?: number;
  costOutputPerMillion?: number;
  config?: { temperature?: number; maxTokens?: number };
}

export interface UpdateModel extends Partial<CreateModel> {}

export interface LLMModelInfo {
  id: string;
  name: string;
  contextLength?: number;
  pricing?: {
    prompt?: number;
    completion?: number;
  };
}

// Question types
export interface Question {
  id: string;
  typeId: string;
  content: string;
  expectedAnswer: string | null;
  evaluationMethod: 'exact_match' | 'contains' | 'regex' | 'llm_judge';
  evaluationCriteria: {
    pattern?: string;
    keywords?: string[];
    rubric?: string;
  } | null;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  weight: number;
  status: 'active' | 'archived';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestion {
  typeId: string;
  content: string;
  expectedAnswer?: string;
  evaluationMethod?: 'exact_match' | 'contains' | 'regex' | 'llm_judge';
  evaluationCriteria?: {
    pattern?: string;
    keywords?: string[];
    rubric?: string;
  };
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  weight?: number;
}

export interface UpdateQuestion extends Partial<CreateQuestion> {}

// Question Type types
export interface QuestionType {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  createdAt: string;
}

export interface CreateQuestionType {
  name: string;
  description?: string;
  weight?: number;
}

export interface UpdateQuestionType extends Partial<CreateQuestionType> {}

// Run types
export interface Run {
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

export interface RunProgress {
  runId: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  successfulTasks: number;
  failedTasks: number;
  progress: number;
}

export interface RunOptions {
  modelIds?: string[];
  questionIds?: string[];
  config?: { temperature?: number; maxTokens?: number };
}

// Ranking types
export interface Ranking {
  id: string;
  runId: string;
  modelId: string;
  position: number;
  score: number;
  deltaPosition: number | null;
  deltaScore: number | null;
  sampleSize: number;
  model?: Model;
}

export interface Comparison {
  modelId: string;
  modelName: string;
  currentScore: number;
  previousScore: number;
  deltaAbsolute: number;
  deltaPercentage: number;
  currentPosition: number;
  previousPosition: number | null;
  positionChange: number | null;
  trend: 'up' | 'down' | 'stable';
}

export interface ModelTrend {
  modelId: string;
  modelName: string;
  scores: Array<{
    runId: string;
    date: string;
    score: number;
    position: number;
  }>;
}

// Task execution types
export interface TaskExecution {
  id: string;
  runId: string;
  modelId: string;
  questionId: string;
  inputPrompt: string;
  responseContent: string | null;
  responseTimeMs: number | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  cost: number | null;
  status: 'pending' | 'success' | 'error' | 'timeout';
  errorMessage: string | null;
  evaluation: Evaluation | null;
}

export interface Evaluation {
  id: string;
  score: number;
  normalizedScore: number;
  justification: string | null;
}

// LLM Test types
export interface LLMTestResponse {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  responseTimeMs: number;
  finishReason: string;
  model: string;
  providerId: string;
}
```

---

## Step 5.3: Create Zustand Stores

Create `/app/client/src/stores/uiStore.ts`:

```typescript
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  adminMode: boolean;
  selectedRunId: string | null;
  comparisonPeriod: 'wow' | 'mom' | 'qoq' | 'yoy';

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleAdminMode: () => void;
  setSelectedRunId: (id: string | null) => void;
  setComparisonPeriod: (period: 'wow' | 'mom' | 'qoq' | 'yoy') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  adminMode: false,
  selectedRunId: null,
  comparisonPeriod: 'wow',

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleAdminMode: () => set((state) => ({ adminMode: !state.adminMode })),
  setSelectedRunId: (id) => set({ selectedRunId: id }),
  setComparisonPeriod: (period) => set({ comparisonPeriod: period }),
}));
```

---

## Step 5.4: Create Layout with Dual Navigation

Create `/app/client/src/components/Layout.tsx`:

```tsx
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  BarChart3,
  Bot,
  History,
  Settings,
  Menu,
  X,
  Server,
  FileQuestion,
  Tags,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

interface LayoutProps {
  children: React.ReactNode;
}

const userNavItems = [
  { path: '/', label: 'Rankings', icon: BarChart3 },
  { path: '/runs', label: 'Run History', icon: History },
];

const adminNavItems = [
  { path: '/admin/providers', label: 'Providers', icon: Server },
  { path: '/admin/models', label: 'Models', icon: Bot },
  { path: '/admin/questions', label: 'Questions', icon: FileQuestion },
  { path: '/admin/question-types', label: 'Question Types', icon: Tags },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { sidebarOpen, adminMode, toggleSidebar, toggleAdminMode } = useUIStore();

  const navItems = adminMode ? adminNavItems : userNavItems;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 transform transition-transform duration-200 ease-in-out',
          'lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-blue-400">SABE</h1>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 hover:bg-gray-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={toggleAdminMode}
            className={clsx(
              'w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors',
              adminMode
                ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            )}
          >
            <div className="flex items-center gap-2">
              <Shield size={18} />
              <span>{adminMode ? 'Admin Mode' : 'User Mode'}</span>
            </div>
            <ChevronRight size={16} />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {adminMode && (
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
              Administration
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive
                    ? adminMode
                      ? 'bg-amber-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                )}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-gray-700 bg-gray-800">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 hover:bg-gray-700 rounded"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            {adminMode && (
              <span className="text-xs px-2 py-1 bg-amber-600/20 text-amber-400 rounded">
                ADMIN
              </span>
            )}
            <span className="text-sm text-gray-400">
              LLM Benchmark Dashboard
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}
```

Update `/app/client/src/App.tsx`:

```tsx
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RankingsPage } from './pages/RankingsPage';
import { RunsPage } from './pages/RunsPage';
import { AdminProvidersPage } from './pages/admin/ProvidersPage';
import { AdminModelsPage } from './pages/admin/ModelsPage';
import { AdminQuestionsPage } from './pages/admin/QuestionsPage';
import { AdminQuestionTypesPage } from './pages/admin/QuestionTypesPage';
import { AdminSettingsPage } from './pages/admin/SettingsPage';

function App() {
  return (
    <Layout>
      <Routes>
        {/* User routes */}
        <Route path="/" element={<RankingsPage />} />
        <Route path="/runs" element={<RunsPage />} />

        {/* Admin routes */}
        <Route path="/admin/providers" element={<AdminProvidersPage />} />
        <Route path="/admin/models" element={<AdminModelsPage />} />
        <Route path="/admin/questions" element={<AdminQuestionsPage />} />
        <Route path="/admin/question-types" element={<AdminQuestionTypesPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
```

---

## Step 5.8: Build Admin: Providers Page

Create `/app/client/src/pages/admin/ProvidersPage.tsx`:

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providersApi } from '../../lib/api';
import type { Provider, CreateProvider } from '../../lib/api';
import { clsx } from 'clsx';
import { Plus, Pencil, Trash2, CheckCircle, XCircle, RefreshCw, Wifi } from 'lucide-react';

export function AdminProvidersPage() {
  const queryClient = useQueryClient();
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: providersApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  });

  const reloadMutation = useMutation({
    mutationFn: providersApi.reload,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['llm', 'status'] }),
  });

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setEditingProvider(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Providers</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage LLM API providers (OpenRouter, OpenAI, etc.)
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg"
        >
          <Plus size={18} />
          Add Provider
        </button>
      </div>

      {showForm && (
        <ProviderForm
          provider={editingProvider}
          onClose={handleCloseForm}
        />
      )}

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : data?.data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No providers configured. Add OpenRouter to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm bg-gray-700/50">
                <th className="p-4">Status</th>
                <th className="p-4">Name</th>
                <th className="p-4">Endpoint</th>
                <th className="p-4">API Key Env Var</th>
                <th className="p-4">Rate Limit</th>
                <th className="p-4">Connection</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((provider) => (
                <ProviderRow
                  key={provider.id}
                  provider={provider}
                  onEdit={() => handleEdit(provider)}
                  onDelete={() => {
                    if (confirm('Delete this provider? All models using it will be affected.')) {
                      deleteMutation.mutate(provider.id);
                    }
                  }}
                  onReload={() => reloadMutation.mutate(provider.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ProviderRow({
  provider,
  onEdit,
  onDelete,
  onReload,
}: {
  provider: Provider;
  onEdit: () => void;
  onDelete: () => void;
  onReload: () => void;
}) {
  const { data: testResult, isLoading: testing, refetch: testConnection } = useQuery({
    queryKey: ['providers', provider.id, 'test'],
    queryFn: () => providersApi.test(provider.id),
    enabled: false,
    retry: false,
  });

  return (
    <tr className="border-t border-gray-700 hover:bg-gray-700/30">
      <td className="p-4">
        <div className="flex items-center gap-2">
          {provider.status === 'active' ? (
            <CheckCircle className="text-green-400" size={16} />
          ) : (
            <XCircle className="text-gray-400" size={16} />
          )}
          <span className="capitalize">{provider.status}</span>
        </div>
      </td>
      <td className="p-4 font-medium">{provider.name}</td>
      <td className="p-4 text-gray-400 font-mono text-sm">
        {provider.apiEndpoint}
      </td>
      <td className="p-4 text-gray-400 font-mono text-sm">
        {provider.apiKeyEnvVar}
      </td>
      <td className="p-4 text-gray-400">
        {provider.rateLimitPerMinute ?? '-'} req/min
      </td>
      <td className="p-4">
        <button
          onClick={() => testConnection()}
          disabled={testing}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          {testing ? (
            <RefreshCw className="animate-spin" size={14} />
          ) : testResult?.data?.connected ? (
            <Wifi className="text-green-400" size={14} />
          ) : testResult?.data ? (
            <Wifi className="text-red-400" size={14} />
          ) : (
            <Wifi size={14} />
          )}
          {testing ? 'Testing...' : 'Test'}
        </button>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={onReload}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="Reload"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-400 hover:bg-red-400/10 rounded"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function ProviderForm({
  provider,
  onClose,
}: {
  provider: Provider | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!provider;

  const [formData, setFormData] = useState<CreateProvider>({
    name: provider?.name ?? '',
    apiEndpoint: provider?.apiEndpoint ?? 'https://openrouter.ai/api/v1',
    apiKeyEnvVar: provider?.apiKeyEnvVar ?? 'OPENROUTER_API_KEY',
    status: provider?.status ?? 'active',
    rateLimitPerMinute: provider?.rateLimitPerMinute ?? 60,
  });

  const createMutation = useMutation({
    mutationFn: providersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateProvider) => providersApi.update(provider!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">
        {isEditing ? 'Edit Provider' : 'Add New Provider'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-700 rounded px-3 py-2"
              placeholder="OpenRouter"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Endpoint *</label>
            <input
              type="url"
              value={formData.apiEndpoint}
              onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
              className="w-full bg-gray-700 rounded px-3 py-2"
              placeholder="https://openrouter.ai/api/v1"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              API Key Environment Variable *
            </label>
            <input
              type="text"
              value={formData.apiKeyEnvVar}
              onChange={(e) => setFormData({ ...formData, apiKeyEnvVar: e.target.value })}
              className="w-full bg-gray-700 rounded px-3 py-2 font-mono"
              placeholder="OPENROUTER_API_KEY"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              The environment variable name (not the key itself)
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Rate Limit (req/min)</label>
            <input
              type="number"
              value={formData.rateLimitPerMinute ?? ''}
              onChange={(e) => setFormData({ ...formData, rateLimitPerMinute: parseInt(e.target.value) || undefined })}
              className="w-full bg-gray-700 rounded px-3 py-2"
              placeholder="60"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              className="w-full bg-gray-700 rounded px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Provider' : 'Add Provider'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## Step 5.9: Build Admin: Models Page

Create `/app/client/src/pages/admin/ModelsPage.tsx`:

This page includes:
- List all models with provider grouping
- Add/Edit/Delete models
- **Import models from provider API** (key feature!)
- Toggle status (active/inactive/deprecated)

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelsApi, providersApi } from '../../lib/api';
import type { Model, CreateModel, Provider, LLMModelInfo } from '../../lib/api';
import { clsx } from 'clsx';
import { Plus, Pencil, Trash2, CheckCircle, XCircle, AlertCircle, Download, Search } from 'lucide-react';

export function AdminModelsPage() {
  const queryClient = useQueryClient();
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [filterProvider, setFilterProvider] = useState<string>('');

  const { data: modelsData, isLoading } = useQuery({
    queryKey: ['models', filterProvider],
    queryFn: () => modelsApi.list(filterProvider ? { providerId: filterProvider } : undefined),
  });

  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: modelsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['models'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' | 'deprecated' }) =>
      modelsApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['models'] }),
  });

  const handleEdit = (model: Model) => {
    setEditingModel(model);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setEditingModel(null);
    setShowForm(false);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="text-green-400" size={16} />;
      case 'inactive': return <XCircle className="text-gray-400" size={16} />;
      case 'deprecated': return <AlertCircle className="text-yellow-400" size={16} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Models</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage LLM models for benchmarking
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            <Download size={18} />
            Import from Provider
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg"
          >
            <Plus size={18} />
            Add Model
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <select
          value={filterProvider}
          onChange={(e) => setFilterProvider(e.target.value)}
          className="bg-gray-800 rounded px-3 py-2"
        >
          <option value="">All Providers</option>
          {providersData?.data.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {showImport && (
        <ImportModelsDialog
          providers={providersData?.data ?? []}
          onClose={() => setShowImport(false)}
        />
      )}

      {showForm && (
        <ModelForm
          model={editingModel}
          providers={providersData?.data ?? []}
          onClose={handleCloseForm}
        />
      )}

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : modelsData?.data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No models configured. Import models from a provider or add manually.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm bg-gray-700/50">
                <th className="p-4">Status</th>
                <th className="p-4">Display Name</th>
                <th className="p-4">Model ID</th>
                <th className="p-4">Cost (per 1M)</th>
                <th className="p-4">Context</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {modelsData?.data.map((model) => (
                <tr key={model.id} className="border-t border-gray-700 hover:bg-gray-700/30">
                  <td className="p-4">
                    <select
                      value={model.status}
                      onChange={(e) => statusMutation.mutate({
                        id: model.id,
                        status: e.target.value as 'active' | 'inactive' | 'deprecated',
                      })}
                      className={clsx(
                        'bg-transparent border rounded px-2 py-1 text-sm',
                        model.status === 'active' && 'border-green-600 text-green-400',
                        model.status === 'inactive' && 'border-gray-600 text-gray-400',
                        model.status === 'deprecated' && 'border-yellow-600 text-yellow-400'
                      )}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="deprecated">Deprecated</option>
                    </select>
                  </td>
                  <td className="p-4 font-medium">{model.displayName}</td>
                  <td className="p-4 text-gray-400 font-mono text-sm">{model.providerModelId}</td>
                  <td className="p-4 text-gray-400 text-sm">
                    ${model.costInputPerMillion?.toFixed(2) ?? '?'} / ${model.costOutputPerMillion?.toFixed(2) ?? '?'}
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    {model.contextSize ? `${(model.contextSize / 1000).toFixed(0)}k` : '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(model)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this model?')) {
                            deleteMutation.mutate(model.id);
                          }
                        }}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Import Dialog - Fetches models from provider API and allows selection
function ImportModelsDialog({
  providers,
  onClose,
}: {
  providers: Provider[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState(providers[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());

  const { data: modelsData, isLoading, refetch } = useQuery({
    queryKey: ['providers', selectedProvider, 'models'],
    queryFn: () => providersApi.listModels(selectedProvider),
    enabled: !!selectedProvider,
  });

  const createMutation = useMutation({
    mutationFn: modelsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['models'] }),
  });

  const filteredModels = modelsData?.data.models.filter(
    (m) => m.id.toLowerCase().includes(search.toLowerCase()) ||
           m.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const handleImport = async () => {
    for (const modelId of selectedModels) {
      const model = modelsData?.data.models.find((m) => m.id === modelId);
      if (model) {
        await createMutation.mutateAsync({
          providerId: selectedProvider,
          providerModelId: model.id,
          displayName: model.name,
          contextSize: model.contextLength,
          costInputPerMillion: model.pricing?.prompt ? model.pricing.prompt * 1000000 : undefined,
          costOutputPerMillion: model.pricing?.completion ? model.pricing.completion * 1000000 : undefined,
        });
      }
    }
    onClose();
  };

  const toggleModel = (id: string) => {
    const next = new Set(selectedModels);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedModels(next);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Import Models from Provider</h2>

        <div className="flex gap-4 mb-4">
          <select
            value={selectedProvider}
            onChange={(e) => {
              setSelectedProvider(e.target.value);
              setSelectedModels(new Set());
            }}
            className="bg-gray-700 rounded px-3 py-2"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="w-full bg-gray-700 rounded pl-10 pr-3 py-2"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto border border-gray-700 rounded mb-4">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading models...</div>
          ) : filteredModels.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No models found</div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredModels.slice(0, 50).map((model) => (
                <label
                  key={model.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-700/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.has(model.id)}
                    onChange={() => toggleModel(model.id)}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{model.name}</p>
                    <p className="text-sm text-gray-400 font-mono">{model.id}</p>
                  </div>
                  {model.contextLength && (
                    <span className="text-sm text-gray-400">
                      {(model.contextLength / 1000).toFixed(0)}k
                    </span>
                  )}
                </label>
              ))}
              {filteredModels.length > 50 && (
                <div className="p-3 text-center text-gray-400 text-sm">
                  Showing first 50 of {filteredModels.length} models. Use search to find more.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">
            {selectedModels.size} model(s) selected
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedModels.size === 0 || createMutation.isPending}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded disabled:opacity-50"
            >
              {createMutation.isPending ? 'Importing...' : `Import ${selectedModels.size} Model(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Model Form component (similar pattern to ProviderForm)
function ModelForm({
  model,
  providers,
  onClose,
}: {
  model: Model | null;
  providers: Provider[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!model;

  const [formData, setFormData] = useState<CreateModel>({
    providerId: model?.providerId ?? providers[0]?.id ?? '',
    providerModelId: model?.providerModelId ?? '',
    displayName: model?.displayName ?? '',
    label: model?.label ?? undefined,
    status: model?.status ?? 'active',
    contextSize: model?.contextSize ?? undefined,
    costInputPerMillion: model?.costInputPerMillion ?? undefined,
    costOutputPerMillion: model?.costOutputPerMillion ?? undefined,
    config: model?.config ?? undefined,
  });

  const createMutation = useMutation({
    mutationFn: modelsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateModel) => modelsApi.update(model!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">
        {isEditing ? 'Edit Model' : 'Add New Model'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Provider *</label>
            <select
              value={formData.providerId}
              onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
              className="w-full bg-gray-700 rounded px-3 py-2"
              required
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Model ID *</label>
            <input
              type="text"
              value={formData.providerModelId}
              onChange={(e) => setFormData({ ...formData, providerModelId: e.target.value })}
              className="w-full bg-gray-700 rounded px-3 py-2 font-mono"
              placeholder="anthropic/claude-3.5-sonnet"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Display Name *</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full bg-gray-700 rounded px-3 py-2"
              placeholder="Claude 3.5 Sonnet"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Label (optional)</label>
            <input
              type="text"
              value={formData.label ?? ''}
              onChange={(e) => setFormData({ ...formData, label: e.target.value || undefined })}
              className="w-full bg-gray-700 rounded px-3 py-2"
              placeholder="Fast, Cheap, etc."
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Context Size</label>
            <input
              type="number"
              value={formData.contextSize ?? ''}
              onChange={(e) => setFormData({ ...formData, contextSize: parseInt(e.target.value) || undefined })}
              className="w-full bg-gray-700 rounded px-3 py-2"
              placeholder="128000"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Cost Input (per 1M tokens)</label>
            <input
              type="number"
              step="0.01"
              value={formData.costInputPerMillion ?? ''}
              onChange={(e) => setFormData({ ...formData, costInputPerMillion: parseFloat(e.target.value) || undefined })}
              className="w-full bg-gray-700 rounded px-3 py-2"
              placeholder="3.00"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Cost Output (per 1M tokens)</label>
            <input
              type="number"
              step="0.01"
              value={formData.costOutputPerMillion ?? ''}
              onChange={(e) => setFormData({ ...formData, costOutputPerMillion: parseFloat(e.target.value) || undefined })}
              className="w-full bg-gray-700 rounded px-3 py-2"
              placeholder="15.00"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Model' : 'Add Model'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## Step 5.10-5.13: Remaining Admin Pages

The remaining admin pages follow the same CRUD pattern:

- **QuestionsPage**: List/Add/Edit/Delete questions with evaluation criteria editor
- **QuestionTypesPage**: Simple CRUD for categories (reasoning, code, factual, etc.)
- **SettingsPage**: Display system status, provider connectivity, database stats

These follow the exact same patterns shown above. See the component structure in the file tree below.

---

## File Structure

```
app/client/src/
├── main.tsx                    # App entry with providers
├── App.tsx                     # Routes configuration
├── index.css                   # Tailwind imports
├── lib/
│   └── api.ts                  # API client with all endpoints
├── stores/
│   └── uiStore.ts              # UI state (sidebar, admin mode)
├── components/
│   ├── Layout.tsx              # Main layout with dual navigation
│   ├── RankingsTable.tsx       # Rankings data table
│   └── RankingsChart.tsx       # ECharts trends chart
└── pages/
    ├── RankingsPage.tsx        # User: Rankings dashboard
    ├── RunsPage.tsx            # User: Run history
    └── admin/
        ├── ProvidersPage.tsx   # Admin: Provider CRUD
        ├── ModelsPage.tsx      # Admin: Model CRUD + Import
        ├── QuestionsPage.tsx   # Admin: Question CRUD
        ├── QuestionTypesPage.tsx # Admin: Question Type CRUD
        └── SettingsPage.tsx    # Admin: Settings
```

---

## Verification Checklist

Before marking Phase 5 complete:

**User Section:**
- [ ] Rankings page shows current rankings
- [ ] Rankings table displays models with scores
- [ ] Charts render with trend data
- [ ] Runs page shows history
- [ ] Run progress updates in real-time

**Admin Section:**
- [ ] Can add/edit/delete providers
- [ ] Can test provider connectivity
- [ ] Can add/edit/delete models
- [ ] **Can import models from provider API**
- [ ] Can toggle model status
- [ ] Can add/edit/delete questions
- [ ] Can add/edit/delete question types
- [ ] Admin/User mode toggle works
- [ ] Mobile layout is responsive

**Build:**
- [ ] `npm run dev` starts without errors
- [ ] `npm run build` succeeds

---

## Next Phase

Once all verifications pass, proceed to:
**→ PHASE_6_AUTOMATION.md**

---

## Key Admin Features Summary

| Feature | Location | Description |
|---------|----------|-------------|
| Provider CRUD | `/admin/providers` | Add OpenRouter or other providers |
| Provider Test | `/admin/providers` | Test API connectivity |
| Model Import | `/admin/models` | Fetch & import models from provider API |
| Model CRUD | `/admin/models` | Manage models for benchmarking |
| Status Toggle | `/admin/models` | Quickly enable/disable models |
| Question CRUD | `/admin/questions` | Manage benchmark prompts |
| Evaluation Config | `/admin/questions` | Set eval method & criteria |
| Question Types | `/admin/question-types` | Manage categories |
