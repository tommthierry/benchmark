// Admin Providers Page
// CRUD operations for LLM API providers

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wifi,
} from 'lucide-react';
import { providersApi } from '../../lib/api';
import type { Provider, CreateProviderInput } from '../../lib/api';

export function ProvidersPage() {
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
        <ProviderForm provider={editingProvider} onClose={handleCloseForm} />
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
  const [testResult, setTestResult] = useState<{ connected: boolean; responseTimeMs: number } | null>(null);
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    try {
      const result = await providersApi.test(provider.id);
      setTestResult(result.data);
    } catch {
      setTestResult({ connected: false, responseTimeMs: 0 });
    } finally {
      setTesting(false);
    }
  };

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
      <td className="p-4 text-gray-400 font-mono text-sm">{provider.apiEndpoint}</td>
      <td className="p-4 text-gray-400 font-mono text-sm">{provider.apiKeyEnvVar}</td>
      <td className="p-4 text-gray-400">{provider.rateLimitPerMinute ?? '-'} req/min</td>
      <td className="p-4">
        <button
          onClick={testConnection}
          disabled={testing}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          {testing ? (
            <RefreshCw className="animate-spin" size={14} />
          ) : testResult?.connected ? (
            <Wifi className="text-green-400" size={14} />
          ) : testResult ? (
            <Wifi className="text-red-400" size={14} />
          ) : (
            <Wifi size={14} />
          )}
          {testing
            ? 'Testing...'
            : testResult?.connected
            ? `${testResult.responseTimeMs}ms`
            : 'Test'}
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

  const [formData, setFormData] = useState<CreateProviderInput>({
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
    mutationFn: (data: CreateProviderInput) => providersApi.update(provider!.id, data),
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
  const error = createMutation.error || updateMutation.error;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">
        {isEditing ? 'Edit Provider' : 'Add New Provider'}
      </h2>
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
          {error.message}
        </div>
      )}
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
              onChange={(e) =>
                setFormData({
                  ...formData,
                  rateLimitPerMinute: parseInt(e.target.value) || 60,
                })
              }
              className="w-full bg-gray-700 rounded px-3 py-2"
              placeholder="60"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
              }
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
