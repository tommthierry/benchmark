// Admin Question Types Page
// CRUD operations for question categories

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { questionTypesApi } from '../../lib/api';
import type { QuestionType, CreateQuestionTypeInput } from '../../lib/api';

export function QuestionTypesPage() {
  const queryClient = useQueryClient();
  const [editingType, setEditingType] = useState<QuestionType | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['questionTypes'],
    queryFn: questionTypesApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: questionTypesApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questionTypes'] }),
  });

  const handleEdit = (type: QuestionType) => {
    setEditingType(type);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setEditingType(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Question Types</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage question categories (reasoning, code, factual, etc.)
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg"
        >
          <Plus size={18} />
          Add Type
        </button>
      </div>

      {showForm && (
        <QuestionTypeForm type={editingType} onClose={handleCloseForm} />
      )}

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : data?.data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No question types defined. Add types to categorize your questions.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm bg-gray-700/50">
                <th className="p-4">Name</th>
                <th className="p-4">Description</th>
                <th className="p-4">Weight</th>
                <th className="p-4">Created</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((type) => (
                <tr key={type.id} className="border-t border-gray-700 hover:bg-gray-700/30">
                  <td className="p-4 font-medium">{type.name}</td>
                  <td className="p-4 text-gray-400">{type.description ?? '-'}</td>
                  <td className="p-4 text-gray-400">{type.weight}</td>
                  <td className="p-4 text-gray-400 text-sm">
                    {new Date(type.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(type)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              'Delete this type? Questions using it may be affected.'
                            )
                          ) {
                            deleteMutation.mutate(type.id);
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

function QuestionTypeForm({
  type,
  onClose,
}: {
  type: QuestionType | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!type;

  const [formData, setFormData] = useState<CreateQuestionTypeInput>({
    name: type?.name ?? '',
    description: type?.description ?? undefined,
    weight: type?.weight ?? 1.0,
  });

  const createMutation = useMutation({
    mutationFn: questionTypesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionTypes'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateQuestionTypeInput) => questionTypesApi.update(type!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionTypes'] });
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
        {isEditing ? 'Edit Question Type' : 'Add New Question Type'}
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
              placeholder="e.g., reasoning, code, factual"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Weight</label>
            <input
              type="number"
              step="0.1"
              value={formData.weight}
              onChange={(e) =>
                setFormData({ ...formData, weight: parseFloat(e.target.value) || 1 })
              }
              className="w-full bg-gray-700 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher weight = more importance in overall ranking
            </p>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
          <textarea
            value={formData.description ?? ''}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value || undefined })
            }
            className="w-full bg-gray-700 rounded px-3 py-2 h-20"
            placeholder="Describe this question category..."
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Type' : 'Add Type'}
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
