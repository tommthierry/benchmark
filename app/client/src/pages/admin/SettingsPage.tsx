// Admin Settings Page
// System status, provider connectivity, and database stats

import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Server,
  Database,
  Bot,
  FileQuestion,
  History,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { healthApi, llmApi, modelsApi, questionsApi, runsApi, providersApi } from '../../lib/api';

export function SettingsPage() {
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.check,
    refetchInterval: 30000,
  });

  const { data: llmStatusData, isLoading: llmLoading } = useQuery({
    queryKey: ['llm', 'status'],
    queryFn: llmApi.status,
  });

  const { data: modelsData } = useQuery({
    queryKey: ['models'],
    queryFn: () => modelsApi.list(),
  });

  const { data: questionsData } = useQuery({
    queryKey: ['questions'],
    queryFn: () => questionsApi.list(),
  });

  const { data: runsData } = useQuery({
    queryKey: ['runs'],
    queryFn: () => runsApi.list({ limit: 100 }),
  });

  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.list,
  });

  const health = healthData?.data;
  const llmStatus = llmStatusData?.data;
  const models = modelsData?.data ?? [];
  const questions = questionsData?.data ?? [];
  const runs = runsData?.data ?? [];
  const providers = providersData?.data ?? [];

  const activeModels = models.filter((m) => m.status === 'active').length;
  const activeQuestions = questions.filter((q) => q.status === 'active').length;
  const completedRuns = runs.filter((r) => r.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          System status and configuration
        </p>
      </div>

      {/* System Health */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Server size={20} />
          System Health
        </h2>
        {healthLoading ? (
          <div className="text-gray-400">Loading...</div>
        ) : health ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">Status</div>
              <div className="flex items-center gap-2">
                {health.status === 'ok' ? (
                  <CheckCircle className="text-green-400" size={20} />
                ) : (
                  <XCircle className="text-red-400" size={20} />
                )}
                <span className="text-lg font-medium capitalize">{health.status}</span>
              </div>
            </div>
            <div className="bg-gray-900 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">Version</div>
              <div className="text-lg font-mono">{health.version}</div>
            </div>
            <div className="bg-gray-900 rounded p-4">
              <div className="text-sm text-gray-400 mb-1">Last Check</div>
              <div className="text-lg">{new Date(health.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        ) : (
          <div className="text-red-400">Failed to load health status</div>
        )}
      </div>

      {/* LLM Providers Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bot size={20} />
          LLM Providers
        </h2>
        {llmLoading ? (
          <div className="text-gray-400">Loading...</div>
        ) : llmStatus ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 rounded p-4">
                <div className="text-sm text-gray-400 mb-1">Total Providers</div>
                <div className="text-2xl font-bold">{providers.length}</div>
              </div>
              <div className="bg-gray-900 rounded p-4">
                <div className="text-sm text-gray-400 mb-1">Registered</div>
                <div className="text-2xl font-bold text-green-400">
                  {llmStatus.totalRegistered}
                </div>
              </div>
              <div className="bg-gray-900 rounded p-4">
                <div className="text-sm text-gray-400 mb-1">Active</div>
                <div className="text-2xl font-bold text-blue-400">{llmStatus.totalActive}</div>
              </div>
              <div className="bg-gray-900 rounded p-4">
                <div className="text-sm text-gray-400 mb-1">Inactive</div>
                <div className="text-2xl font-bold text-gray-400">
                  {providers.length - llmStatus.totalActive}
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-700">
              {llmStatus.providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    {provider.registered ? (
                      <CheckCircle className="text-green-400" size={18} />
                    ) : (
                      <XCircle className="text-red-400" size={18} />
                    )}
                    <div>
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-sm text-gray-400 font-mono">
                        {provider.apiEndpoint}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {provider.rateLimitPerMinute} req/min
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-gray-400">No provider status available</div>
        )}
      </div>

      {/* Database Stats */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database size={20} />
          Database Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Bot}
            label="Models"
            value={models.length}
            subValue={`${activeModels} active`}
            color="text-blue-400"
          />
          <StatCard
            icon={FileQuestion}
            label="Questions"
            value={questions.length}
            subValue={`${activeQuestions} active`}
            color="text-green-400"
          />
          <StatCard
            icon={History}
            label="Benchmark Runs"
            value={runs.length}
            subValue={`${completedRuns} completed`}
            color="text-amber-400"
          />
          <StatCard
            icon={Server}
            label="Providers"
            value={providers.length}
            subValue={`${providers.filter((p) => p.status === 'active').length} active`}
            color="text-purple-400"
          />
        </div>
      </div>

      {/* Configuration Info */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Configuration</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-gray-700">
            <span className="text-gray-400">Application</span>
            <span>SABE - Systeme Autonome de Benchmarking Evolutif</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-700">
            <span className="text-gray-400">Environment</span>
            <span className="font-mono">Development</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-700">
            <span className="text-gray-400">Database</span>
            <span className="font-mono">SQLite (Drizzle ORM)</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-400">API Endpoint</span>
            <span className="font-mono">/api</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  subValue: string;
  color: string;
}) {
  return (
    <div className="bg-gray-900 rounded p-4">
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        <Icon size={18} className={color} />
        <span className="text-sm">{label}</span>
      </div>
      <div className={clsx('text-2xl font-bold', color)}>{value}</div>
      <div className="text-sm text-gray-500">{subValue}</div>
    </div>
  );
}
