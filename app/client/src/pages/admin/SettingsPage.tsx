// Admin Settings Page - Game configuration
// Manage arena game settings (rounds per session, step delay)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
  Settings,
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
          Configure arena game settings
        </p>
      </div>

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

  // Sync local state when config loads
  useEffect(() => {
    if (config) {
      setRoundsPerSession(config.roundsPerSession || 5);
      setStepDelayMs(config.stepDelayMs || 2000);
    }
  }, [config]);

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
