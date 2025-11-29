// Rankings Dashboard Page
// Displays current LLM rankings with table and charts

import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus, Trophy, RefreshCw } from 'lucide-react';
import { rankingsApi } from '../lib/api';
import { useUIStore } from '../stores/uiStore';
import { RankingsChart } from '../components/RankingsChart';
import type { ComparisonPeriod } from '@sabe/shared';

const periodLabels: Record<ComparisonPeriod, string> = {
  wow: 'Week over Week',
  mom: 'Month over Month',
  qoq: 'Quarter over Quarter',
  yoy: 'Year over Year',
};

export function RankingsPage() {
  const { comparisonPeriod, setComparisonPeriod } = useUIStore();

  const { data: rankingsData, isLoading: rankingsLoading, refetch } = useQuery({
    queryKey: ['rankings', 'latest'],
    queryFn: rankingsApi.getLatest,
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['rankings', 'trends'],
    queryFn: () => rankingsApi.getTrends(10),
  });

  const { data: comparisonData } = useQuery({
    queryKey: ['rankings', 'compare', comparisonPeriod],
    queryFn: () => rankingsApi.compare(comparisonPeriod),
  });

  const isLoading = rankingsLoading || trendsLoading;
  const rankings = rankingsData?.data ?? [];
  const run = rankingsData?.run;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-400" size={28} />
            LLM Rankings
          </h1>
          {run && (
            <p className="text-gray-400 text-sm mt-1">
              Iteration #{run.iterationNumber} &middot;{' '}
              {run.completedAt
                ? new Date(run.completedAt).toLocaleDateString()
                : 'In progress'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={comparisonPeriod}
            onChange={(e) => setComparisonPeriod(e.target.value as ComparisonPeriod)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
          >
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rankings Table - 2 columns */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-semibold">Current Rankings</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading rankings...</div>
          ) : rankings.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No rankings available. Run a benchmark to see results.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm bg-gray-700/50">
                    <th className="p-4 w-16">#</th>
                    <th className="p-4">Model</th>
                    <th className="p-4 text-right">Score</th>
                    <th className="p-4 text-right">Change</th>
                    <th className="p-4 text-right">Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((ranking, index) => {
                    const posChange = ranking.deltaPosition;
                    const scoreChange = ranking.deltaScore;

                    return (
                      <tr
                        key={ranking.id}
                        className="border-t border-gray-700 hover:bg-gray-700/30"
                      >
                        <td className="p-4">
                          <div
                            className={clsx(
                              'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                              index === 0 && 'bg-yellow-600 text-white',
                              index === 1 && 'bg-gray-400 text-gray-900',
                              index === 2 && 'bg-amber-700 text-white',
                              index > 2 && 'bg-gray-700 text-gray-300'
                            )}
                          >
                            {ranking.position}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">
                            {ranking.model?.displayName ?? 'Unknown Model'}
                          </div>
                          <div className="text-sm text-gray-400 font-mono">
                            {ranking.model?.providerModelId ?? ranking.modelId}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-mono text-lg">
                            {ranking.score.toFixed(1)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {posChange !== null && posChange !== 0 && (
                              <span
                                className={clsx(
                                  'flex items-center gap-1 text-sm',
                                  posChange > 0 && 'text-green-400',
                                  posChange < 0 && 'text-red-400'
                                )}
                              >
                                {posChange > 0 ? (
                                  <TrendingUp size={14} />
                                ) : (
                                  <TrendingDown size={14} />
                                )}
                                {Math.abs(posChange)}
                              </span>
                            )}
                            {(posChange === null || posChange === 0) && (
                              <span className="text-gray-500 flex items-center gap-1">
                                <Minus size={14} />
                              </span>
                            )}
                            {scoreChange !== null && (
                              <span
                                className={clsx(
                                  'text-xs',
                                  scoreChange > 0 && 'text-green-400',
                                  scoreChange < 0 && 'text-red-400',
                                  scoreChange === 0 && 'text-gray-500'
                                )}
                              >
                                ({scoreChange >= 0 ? '+' : ''}
                                {scoreChange.toFixed(1)})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right text-gray-400">
                          {ranking.sampleSize}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          {/* Period Comparison */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-4">{periodLabels[comparisonPeriod]}</h3>
            {comparisonData?.data && comparisonData.data.length > 0 ? (
              <div className="space-y-3">
                {comparisonData.data.slice(0, 5).map((comparison) => (
                  <div
                    key={comparison.modelId}
                    className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
                  >
                    <span className="text-sm truncate flex-1">
                      {comparison.modelName}
                    </span>
                    <span
                      className={clsx(
                        'text-sm font-medium ml-2',
                        comparison.trend === 'up' && 'text-green-400',
                        comparison.trend === 'down' && 'text-red-400',
                        comparison.trend === 'stable' && 'text-gray-400'
                      )}
                    >
                      {comparison.deltaPercentage >= 0 ? '+' : ''}
                      {comparison.deltaPercentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No comparison data available</p>
            )}
          </div>

          {/* Top Performers */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-4">Top 3</h3>
            <div className="space-y-3">
              {rankings.slice(0, 3).map((ranking, index) => (
                <div key={ranking.id} className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      index === 0 && 'bg-yellow-600',
                      index === 1 && 'bg-gray-400 text-gray-900',
                      index === 2 && 'bg-amber-700'
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 truncate text-sm">
                    {ranking.model?.displayName ?? 'Unknown'}
                  </div>
                  <span className="font-mono text-sm">{ranking.score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trends Chart */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="font-semibold mb-4">Score Trends</h2>
        {trendsLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            Loading trends...
          </div>
        ) : trendsData?.data && trendsData.data.length > 0 ? (
          <RankingsChart trends={trendsData.data} />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No trend data available. Run multiple benchmarks to see trends.
          </div>
        )}
      </div>
    </div>
  );
}
