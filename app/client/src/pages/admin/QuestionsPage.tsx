// Admin Questions Page
// CRUD operations for benchmark questions

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { questionsApi, questionTypesApi } from '../../lib/api';
import type { Question, QuestionType, CreateQuestionInput } from '../../lib/api';

const difficultyColors = {
  easy: 'bg-green-600',
  medium: 'bg-blue-600',
  hard: 'bg-orange-600',
  expert: 'bg-red-600',
};

const methodLabels = {
  exact_match: 'Exact Match',
  contains: 'Contains Keywords',
  regex: 'Regex Pattern',
  llm_judge: 'LLM Judge',
};

export function QuestionsPage() {
  const queryClient = useQueryClient();
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: questionsData, isLoading } = useQuery({
    queryKey: ['questions', filterType],
    queryFn: () => questionsApi.list(filterType ? { typeId: filterType } : undefined),
  });

  const { data: typesData } = useQuery({
    queryKey: ['questionTypes'],
    queryFn: questionTypesApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: questionsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] }),
  });

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setEditingQuestion(null);
    setShowForm(false);
  };

  const getTypeName = (typeId: string) => {
    return typesData?.data.find((t) => t.id === typeId)?.name ?? 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Questions</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage benchmark prompts and evaluation criteria
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg"
        >
          <Plus size={18} />
          Add Question
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
        >
          <option value="">All Types</option>
          {typesData?.data.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <QuestionForm
          question={editingQuestion}
          types={typesData?.data ?? []}
          onClose={handleCloseForm}
        />
      )}

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : questionsData?.data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No questions configured. Add questions to start benchmarking.
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {questionsData?.data.map((question) => (
              <div key={question.id}>
                <div
                  className="flex items-center gap-4 p-4 hover:bg-gray-700/30 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === question.id ? null : question.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={clsx(
                          'text-xs px-2 py-0.5 rounded',
                          difficultyColors[question.difficulty]
                        )}
                      >
                        {question.difficulty}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-600">
                        {getTypeName(question.typeId)}
                      </span>
                      <span className="text-xs text-gray-500">v{question.version}</span>
                      {question.status === 'archived' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-600 text-gray-400">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-sm line-clamp-2">{question.content}</p>
                  </div>
                  <div className="text-sm text-gray-400">
                    {methodLabels[question.evaluationMethod]}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(question);
                      }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this question?')) {
                          deleteMutation.mutate(question.id);
                        }
                      }}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                    {expandedId === question.id ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </div>
                </div>
                {expandedId === question.id && (
                  <div className="px-4 pb-4 bg-gray-700/20">
                    <div className="p-4 bg-gray-900 rounded-lg space-y-3 text-sm">
                      <div>
                        <div className="text-gray-400 mb-1">Full Content:</div>
                        <div className="bg-gray-800 p-2 rounded whitespace-pre-wrap">
                          {question.content}
                        </div>
                      </div>
                      {question.expectedAnswer && (
                        <div>
                          <div className="text-gray-400 mb-1">Expected Answer:</div>
                          <div className="bg-gray-800 p-2 rounded whitespace-pre-wrap">
                            {question.expectedAnswer}
                          </div>
                        </div>
                      )}
                      {question.evaluationCriteria && (
                        <div>
                          <div className="text-gray-400 mb-1">Evaluation Criteria:</div>
                          <div className="bg-gray-800 p-2 rounded font-mono text-xs">
                            {JSON.stringify(question.evaluationCriteria, null, 2)}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-4 pt-2">
                        <div>
                          <span className="text-gray-400">Weight:</span> {question.weight}
                        </div>
                        <div>
                          <span className="text-gray-400">Created:</span>{' '}
                          {new Date(question.createdAt).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="text-gray-400">Updated:</span>{' '}
                          {new Date(question.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionForm({
  question,
  types,
  onClose,
}: {
  question: Question | null;
  types: QuestionType[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!question;

  const [formData, setFormData] = useState<CreateQuestionInput>({
    typeId: question?.typeId ?? types[0]?.id ?? '',
    content: question?.content ?? '',
    expectedAnswer: question?.expectedAnswer ?? undefined,
    evaluationMethod: question?.evaluationMethod ?? 'llm_judge',
    evaluationCriteria: question?.evaluationCriteria ?? undefined,
    difficulty: question?.difficulty ?? 'medium',
    weight: question?.weight ?? 1.0,
    status: question?.status ?? 'active',
  });

  const [criteriaType, setCriteriaType] = useState<'keywords' | 'pattern' | 'rubric' | 'none'>(
    question?.evaluationCriteria?.keywords
      ? 'keywords'
      : question?.evaluationCriteria?.pattern
      ? 'pattern'
      : question?.evaluationCriteria?.rubric
      ? 'rubric'
      : 'none'
  );

  const createMutation = useMutation({
    mutationFn: questionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreateQuestionInput) => questionsApi.update(question!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
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

  const updateCriteria = (type: string, value: string) => {
    if (type === 'keywords') {
      setFormData({
        ...formData,
        evaluationCriteria: {
          keywords: value.split(',').map((k) => k.trim()).filter(Boolean),
        },
      });
    } else if (type === 'pattern') {
      setFormData({
        ...formData,
        evaluationCriteria: { pattern: value },
      });
    } else if (type === 'rubric') {
      setFormData({
        ...formData,
        evaluationCriteria: { rubric: value },
      });
    } else {
      setFormData({ ...formData, evaluationCriteria: undefined });
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">
        {isEditing ? 'Edit Question' : 'Add New Question'}
      </h2>
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
          {error.message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Question Type *</label>
            <select
              value={formData.typeId}
              onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
              className="w-full bg-gray-700 rounded px-3 py-2"
              required
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Difficulty</label>
            <select
              value={formData.difficulty}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  difficulty: e.target.value as 'easy' | 'medium' | 'hard' | 'expert',
                })
              }
              className="w-full bg-gray-700 rounded px-3 py-2"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Weight</label>
            <input
              type="number"
              step="0.1"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 1 })}
              className="w-full bg-gray-700 rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Question Content *</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full bg-gray-700 rounded px-3 py-2 h-32"
            placeholder="Enter the benchmark question..."
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Expected Answer (optional)</label>
          <textarea
            value={formData.expectedAnswer ?? ''}
            onChange={(e) =>
              setFormData({ ...formData, expectedAnswer: e.target.value || undefined })
            }
            className="w-full bg-gray-700 rounded px-3 py-2 h-20"
            placeholder="The expected or reference answer..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Evaluation Method</label>
            <select
              value={formData.evaluationMethod}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  evaluationMethod: e.target.value as 'exact_match' | 'contains' | 'regex' | 'llm_judge',
                })
              }
              className="w-full bg-gray-700 rounded px-3 py-2"
            >
              <option value="exact_match">Exact Match</option>
              <option value="contains">Contains Keywords</option>
              <option value="regex">Regex Pattern</option>
              <option value="llm_judge">LLM Judge</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Criteria Type</label>
            <select
              value={criteriaType}
              onChange={(e) => {
                setCriteriaType(e.target.value as 'keywords' | 'pattern' | 'rubric' | 'none');
                updateCriteria(e.target.value, '');
              }}
              className="w-full bg-gray-700 rounded px-3 py-2"
            >
              <option value="none">None</option>
              <option value="keywords">Keywords</option>
              <option value="pattern">Regex Pattern</option>
              <option value="rubric">Rubric</option>
            </select>
          </div>
        </div>

        {criteriaType === 'keywords' && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={formData.evaluationCriteria?.keywords?.join(', ') ?? ''}
              onChange={(e) => updateCriteria('keywords', e.target.value)}
              className="w-full bg-gray-700 rounded px-3 py-2"
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>
        )}

        {criteriaType === 'pattern' && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Regex Pattern</label>
            <input
              type="text"
              value={formData.evaluationCriteria?.pattern ?? ''}
              onChange={(e) => updateCriteria('pattern', e.target.value)}
              className="w-full bg-gray-700 rounded px-3 py-2 font-mono"
              placeholder="^\\d+$"
            />
          </div>
        )}

        {criteriaType === 'rubric' && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Evaluation Rubric</label>
            <textarea
              value={formData.evaluationCriteria?.rubric ?? ''}
              onChange={(e) => updateCriteria('rubric', e.target.value)}
              className="w-full bg-gray-700 rounded px-3 py-2 h-20"
              placeholder="Describe how to evaluate the response..."
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Question' : 'Add Question'}
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
