// Admin Settings Page - Execution control and configuration
// Manage arena execution mode (manual/cron) and timing settings

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { clsx } from 'clsx';
import {
  Settings,
  Play,
  Calendar,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Timer,
} from 'lucide-react';
import { configApi, type ExecutionConfig } from '../../lib/api';

export function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: configData, isLoading, error } = useQuery({
    queryKey: ['config'],
    queryFn: configApi.get,
  });

  const updateMutation = useMutation({
    mutationFn: configApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });

  const config = configData?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="text-red-400" size={20} />
        <span className="text-red-300">Failed to load configuration</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure arena execution mode and timing
        </p>
      </div>

      {/* Execution Mode */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap size={20} />
          Execution Mode
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => updateMutation.mutate({ executionMode: 'manual' })}
            disabled={updateMutation.isPending}
            className={clsx(
              'p-4 rounded-lg border-2 transition-all text-left',
              config?.executionMode === 'manual'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 hover:border-gray-600'
            )}
          >
            <Play className="mb-2" size={24} />
            <div className="font-medium">Manual</div>
            <div className="text-sm text-gray-400">
              Trigger iterations with a button click
            </div>
          </button>

          <button
            onClick={() => updateMutation.mutate({ executionMode: 'cron' })}
            disabled={updateMutation.isPending}
            className={clsx(
              'p-4 rounded-lg border-2 transition-all text-left',
              config?.executionMode === 'cron'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 hover:border-gray-600'
            )}
          >
            <Calendar className="mb-2" size={24} />
            <div className="font-medium">Scheduled (Cron)</div>
            <div className="text-sm text-gray-400">
              Automatic execution on schedule
            </div>
          </button>
        </div>
      </div>

      {/* Cron Configuration - shown when cron mode */}
      {config?.executionMode === 'cron' && (
        <CronConfigSection config={config} onUpdate={updateMutation.mutate} isPending={updateMutation.isPending} />
      )}

      {/* Manual Trigger - shown when manual mode */}
      {config?.executionMode === 'manual' && (
        <ManualTriggerSection />
      )}

      {/* Game Settings */}
      <GameSettingsSection config={config} onUpdate={updateMutation.mutate} isPending={updateMutation.isPending} />

      {/* Save Indicator */}
      {updateMutation.isPending && (
        <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
          <RefreshCw className="animate-spin text-blue-400" size={16} />
          <span className="text-sm text-gray-300">Saving...</span>
        </div>
      )}

      {updateMutation.isSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-900/30 border border-green-700 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
          <CheckCircle className="text-green-400" size={16} />
          <span className="text-sm text-green-300">Saved</span>
        </div>
      )}
    </div>
  );
}

// Cron Configuration Section
function CronConfigSection({
  config,
  onUpdate,
  isPending,
}: {
  config: ExecutionConfig | undefined;
  onUpdate: (data: Partial<ExecutionConfig>) => void;
  isPending: boolean;
}) {
  const [cronExpression, setCronExpression] = useState(config?.cronExpression || '0 2 * * 1');
  const [timezone, setTimezone] = useState(config?.timezone || 'UTC');

  const handleSave = () => {
    onUpdate({ cronExpression, timezone });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock size={20} />
        Schedule Configuration
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Cron Expression
          </label>
          <input
            type="text"
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 font-mono text-sm focus:outline-none focus:border-blue-500"
            placeholder="0 2 * * 1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: minute hour day-of-month month day-of-week
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Europe/Paris">Europe/Paris</option>
            <option value="Asia/Tokyo">Asia/Tokyo</option>
          </select>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Save Schedule
          </button>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 mt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Common Cron Examples</h3>
          <div className="space-y-1 text-sm text-gray-500">
            <div><code className="text-gray-300">0 2 * * 1</code> - Every Monday at 2 AM</div>
            <div><code className="text-gray-300">0 0 1 * *</code> - First of every month at midnight</div>
            <div><code className="text-gray-300">0 */6 * * *</code> - Every 6 hours</div>
            <div><code className="text-gray-300">0 9 * * 1-5</code> - Weekdays at 9 AM</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Manual Trigger Section
function ManualTriggerSection() {
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTrigger = async () => {
    setIsTriggering(true);
    try {
      // TODO: This will connect to /api/arena/trigger in Phase 1
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Manual trigger executed');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Play size={20} />
        Manual Control
      </h2>

      <p className="text-gray-400 text-sm mb-4">
        In manual mode, each step of the arena game is triggered by clicking the button below.
        This allows you to control the pace of the competition.
      </p>

      <button
        onClick={handleTrigger}
        disabled={isTriggering}
        className={clsx(
          'w-full py-4 rounded-lg font-medium text-lg transition-all flex items-center justify-center gap-3',
          isTriggering
            ? 'bg-gray-700 text-gray-400'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        )}
      >
        {isTriggering ? (
          <>
            <RefreshCw className="animate-spin" size={20} />
            Executing Step...
          </>
        ) : (
          <>
            <Zap size={20} />
            Run Next Step
          </>
        )}
      </button>

      <div className="mt-4 bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 flex items-start gap-3">
        <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-amber-200">
          Arena game engine will be available after Phase 1 is implemented.
          This button is a placeholder for now.
        </p>
      </div>
    </div>
  );
}

// Game Settings Section
function GameSettingsSection({
  config,
  onUpdate,
  isPending,
}: {
  config: ExecutionConfig | undefined;
  onUpdate: (data: Partial<ExecutionConfig>) => void;
  isPending: boolean;
}) {
  const [roundsPerSession, setRoundsPerSession] = useState(config?.roundsPerSession || 5);
  const [stepDelayMs, setStepDelayMs] = useState(config?.stepDelayMs || 2000);

  const handleSave = () => {
    onUpdate({ roundsPerSession, stepDelayMs });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Settings size={20} />
        Game Settings
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Rounds Per Session
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="20"
              value={roundsPerSession}
              onChange={(e) => setRoundsPerSession(parseInt(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="w-12 text-center font-mono text-lg">{roundsPerSession}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Number of rounds in each game session
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
            <Timer size={16} />
            Step Delay (ms)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="500"
              max="10000"
              step="500"
              value={stepDelayMs}
              onChange={(e) => setStepDelayMs(parseInt(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="w-20 text-center font-mono text-lg">{stepDelayMs}ms</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Delay between each step for visibility ({(stepDelayMs / 1000).toFixed(1)} seconds)
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Save Game Settings
          </button>
        </div>
      </div>
    </div>
  );
}
