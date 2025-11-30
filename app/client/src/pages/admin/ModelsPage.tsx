// Admin Models Page
// CRUD operations for LLM models with import from provider API

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Search,
  X,
} from 'lucide-react';
import { modelsApi, providersApi } from '../../lib/api';
import type { Model, Provider, CreateModelInput, LLMModelInfo } from '../../lib/api';

export function ModelsPage() {
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
      case 'active':
        return <CheckCircle className="text-green-400" size={16} />;
      case 'inactive':
        return <XCircle className="text-gray-400" size={16} />;
      case 'deprecated':
        return <AlertCircle className="text-yellow-400" size={16} />;
      default:
        return null;
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
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
        >
          <option value="">All Providers</option>
          {providersData?.data.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
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
                      onChange={(e) =>
                        statusMutation.mutate({
                          id: model.id,
                          status: e.target.value as 'active' | 'inactive' | 'deprecated',
                        })
                      }
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
                    ${model.costInputPerMillion?.toFixed(2) ?? '?'} / $
                    {model.costOutputPerMillion?.toFixed(2) ?? '?'}
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

  const { data: modelsData, isLoading } = useQuery({
    queryKey: ['providers', selectedProvider, 'models'],
    queryFn: () => providersApi.listModels(selectedProvider),
    enabled: !!selectedProvider,
  });

  const createMutation = useMutation({
    mutationFn: modelsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['models'] }),
  });

  const [importing, setImporting] = useState(false);

  const filteredModels =
    modelsData?.data.models.filter(
      (m) =>
        m.id.toLowerCase().includes(search.toLowerCase()) ||
        (m.name && m.name.toLowerCase().includes(search.toLowerCase()))
    ) ?? [];

  const handleImport = async () => {
    setImporting(true);
    try {
      for (const modelId of selectedModels) {
        const model = modelsData?.data.models.find((m) => m.id === modelId);
        if (model) {
          await createMutation.mutateAsync({
            providerId: selectedProvider,
            providerModelId: model.id,
            displayName: model.name || model.id,
            status: 'active',
            contextSize: model.contextLength,
            costInputPerMillion: model.pricing?.prompt
              ? model.pricing.prompt * 1000000
              : undefined,
            costOutputPerMillion: model.pricing?.completion
              ? model.pricing.completion * 1000000
              : undefined,
          });
        }
      }
      onClose();
    } finally {
      setImporting(false);
    }
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Import Models from Provider</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded">
            <X size={20} />
          </button>
        </div>

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
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
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
                    <p className="font-medium">{model.name || model.id}</p>
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
          <span className="text-sm text-gray-400">{selectedModels.size} model(s) selected</span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedModels.size === 0 || importing}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${selectedModels.size} Model(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Model Form component
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

  const [formData, setFormData] = useState<CreateModelInput>({
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
    mutationFn: (data: CreateModelInput) => modelsApi.update(model!.id, data),
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
  const error = createMutation.error || updateMutation.error;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">
        {isEditing ? 'Edit Model' : 'Add New Model'}
      </h2>
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
          {error.message}
        </div>
      )}
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
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
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
              onChange={(e) =>
                setFormData({ ...formData, contextSize: parseInt(e.target.value) || undefined })
              }
              className="w-full bg-gray-700 rounded px-3 py-2"
              placeholder="128000"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Cost Input (per 1M tokens)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.costInputPerMillion ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  costInputPerMillion: e.target.value === '' ? undefined : parseFloat(e.target.value),
                })
              }
              className="w-full bg-gray-700 rounded px-3 py-2"
              placeholder="3.00 (0 for free)"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Cost Output (per 1M tokens)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.costOutputPerMillion ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  costOutputPerMillion: e.target.value === '' ? undefined : parseFloat(e.target.value),
                })
              }
              className="w-full bg-gray-700 rounded px-3 py-2"
              placeholder="15.00 (0 for free)"
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
