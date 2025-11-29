// Benchmark Runs History Page
// Displays run history with details and progress

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  StopCircle,
} from 'lucide-react';
import { runsApi } from '../lib/api';
import type { BenchmarkRun, BenchmarkProgress, BenchmarkRunSummary } from '../lib/api';

const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; animate?: boolean }> = {
  pending: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-600' },
  running: { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-600', animate: true },
  completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-600' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-600' },
  cancelled: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-600' },
};

export function RunsPage() {
  const queryClient = useQueryClient();
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  const { data: runsData, isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => runsApi.list({ limit: 20 }),
    refetchInterval: 5000, // Poll for updates
  });

  const startMutation = useMutation({
    mutationFn: () => runsApi.start(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    },
  });

  const runs = runsData?.data ?? [];
  const hasRunningRun = runs.some((r) => r.status === 'running' || r.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Benchmark Runs</h1>
          <p className="text-gray-400 text-sm mt-1">
            History of benchmark executions
          </p>
        </div>
        <button
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending || hasRunningRun}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
            hasRunningRun
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          )}
        >
          <Play size={18} />
          {startMutation.isPending ? 'Starting...' : 'Start New Run'}
        </button>
      </div>

      {/* Runs List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading runs...</div>
        ) : runs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No benchmark runs yet. Start your first run!
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {runs.map((run) => (
              <RunRow
                key={run.id}
                run={run}
                isExpanded={expandedRunId === run.id}
                onToggle={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RunRow({
  run,
  isExpanded,
  onToggle,
}: {
  run: BenchmarkRun;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const queryClient = useQueryClient();
  const config = statusConfig[run.status];
  const StatusIcon = config.icon;

  const { data: progressData } = useQuery({
    queryKey: ['runs', run.id, 'progress'],
    queryFn: () => runsApi.getProgress(run.id),
    enabled: run.status === 'running',
    refetchInterval: 2000,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['runs', run.id, 'summary'],
    queryFn: () => runsApi.getSummary(run.id),
    enabled: isExpanded && run.status === 'completed',
  });

  const cancelMutation = useMutation({
    mutationFn: () => runsApi.cancel(run.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    },
  });

  const progress = progressData?.data;
  const summary = summaryData?.data;

  return (
    <div>
      <div
        className="flex items-center gap-4 p-4 hover:bg-gray-700/30 cursor-pointer"
        onClick={onToggle}
      >
        {/* Status */}
        <div className={clsx('p-2 rounded-lg', config.bg)}>
          <StatusIcon
            size={20}
            className={clsx(config.animate && 'animate-spin')}
          />
        </div>

        {/* Run Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">Run #{run.iterationNumber}</span>
            <span
              className={clsx(
                'text-xs px-2 py-0.5 rounded capitalize',
                config.bg
              )}
            >
              {run.status}
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {run.modelsCount} models &middot; {run.questionsCount} questions
          </div>
        </div>

        {/* Progress Bar (for running) */}
        {run.status === 'running' && progress && (
          <div className="w-32">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>{progress.completedTasks}/{progress.totalTasks}</span>
              <span>{progress.progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-right text-sm text-gray-400">
          <div>
            {run.startedAt
              ? new Date(run.startedAt).toLocaleString()
              : new Date(run.createdAt).toLocaleString()}
          </div>
          {run.completedAt && (
            <div className="text-xs">
              Duration:{' '}
              {Math.round(
                (new Date(run.completedAt).getTime() -
                  new Date(run.startedAt!).getTime()) /
                  1000
              )}
              s
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {run.status === 'running' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                cancelMutation.mutate();
              }}
              className="p-2 text-red-400 hover:bg-red-400/10 rounded"
              title="Cancel Run"
            >
              <StopCircle size={18} />
            </button>
          )}
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 bg-gray-700/20">
          <div className="p-4 bg-gray-900 rounded-lg">
            {run.status === 'completed' && summary ? (
              <RunSummary summary={summary} />
            ) : run.status === 'failed' && run.errorLog ? (
              <div className="text-red-400">
                <div className="font-semibold mb-2">Error:</div>
                <pre className="text-sm bg-red-900/20 p-2 rounded overflow-x-auto">
                  {run.errorLog}
                </pre>
              </div>
            ) : run.status === 'running' && progress ? (
              <RunProgress progress={progress} />
            ) : (
              <div className="text-gray-400">No details available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RunProgress({ progress }: { progress: BenchmarkProgress }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Completed" value={progress.completedTasks} total={progress.totalTasks} />
      <StatCard label="Successful" value={progress.successfulTasks} color="text-green-400" />
      <StatCard label="Failed" value={progress.failedTasks} color="text-red-400" />
      <StatCard
        label="Est. Remaining"
        value={
          progress.estimatedTimeRemainingMs
            ? `${Math.round(progress.estimatedTimeRemainingMs / 1000)}s`
            : '-'
        }
      />
    </div>
  );
}

function RunSummary({ summary }: { summary: BenchmarkRunSummary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Avg Score"
        value={summary.averageScore?.toFixed(1) ?? '-'}
        color="text-blue-400"
      />
      <StatCard label="Success Rate" value={`${((summary.successfulTasks / summary.totalTasks) * 100).toFixed(0)}%`} />
      <StatCard
        label="Total Cost"
        value={`$${summary.totalCost.toFixed(4)}`}
        color="text-amber-400"
      />
      <StatCard
        label="Avg Response"
        value={summary.averageResponseTimeMs ? `${Math.round(summary.averageResponseTimeMs)}ms` : '-'}
      />
      <StatCard label="Input Tokens" value={summary.totalTokensInput.toLocaleString()} />
      <StatCard label="Output Tokens" value={summary.totalTokensOutput.toLocaleString()} />
      <StatCard
        label="Duration"
        value={summary.durationMs ? `${(summary.durationMs / 1000).toFixed(1)}s` : '-'}
      />
      <StatCard
        label="Tasks"
        value={`${summary.successfulTasks}/${summary.totalTasks}`}
        color={summary.failedTasks > 0 ? 'text-yellow-400' : 'text-green-400'}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  total,
  color = 'text-white',
}: {
  label: string;
  value: string | number;
  total?: number;
  color?: string;
}) {
  return (
    <div className="bg-gray-800 rounded p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={clsx('font-mono text-lg', color)}>
        {value}
        {total !== undefined && <span className="text-gray-500 text-sm">/{total}</span>}
      </div>
    </div>
  );
}
