// Modal showing model's answer, judgments, and reasoning
// Fetches data from API when opened

import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Star, Clock, Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { arenaApi } from '../../lib/api';
import { modalBackdrop, modalContent } from '../../styles/animations';

interface ModelDetailModalProps {
  modelId: string;
  roundId?: string;
  onClose: () => void;
}

export function ModelDetailModal({ modelId, roundId, onClose }: ModelDetailModalProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['arena', 'model-detail', roundId, modelId],
    queryFn: () => arenaApi.getModelRoundDetail(roundId!, modelId),
    enabled: !!roundId,
  });

  const detail = data?.data;

  return (
    <AnimatePresence>
      <motion.div
        variants={modalBackdrop}
        initial="initial"
        animate="animate"
        exit="exit"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
        onClick={onClose}
      >
        <motion.div
          variants={modalContent}
          initial="initial"
          animate="animate"
          exit="exit"
          className="bg-[var(--color-bg-secondary)] rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden border border-[var(--color-bg-tertiary)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-bg-tertiary)]">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
                {detail?.model?.displayName ?? 'Loading...'}
              </h2>
              {detail?.isMaster && (
                <Crown size={16} className="text-[var(--color-master)]" />
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-muted)]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-5 overflow-y-auto max-h-[60vh]">
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState message={roundId ? 'Failed to load details' : 'No round in progress'} />
            ) : !detail ? (
              <ErrorState message="No details available" />
            ) : (
              <>
                {/* Master indicator */}
                {detail.isMaster && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--color-master)]/10 border border-[var(--color-master)]/30">
                    <Crown size={14} className="text-[var(--color-master)]" />
                    <span className="text-xs text-[var(--color-master)]">
                      Master of this round
                    </span>
                  </div>
                )}

                {/* Answer section */}
                {detail.answer && (
                  <section>
                    <SectionHeader icon={MessageSquare} title="Answer" />
                    <div className="bg-[var(--color-bg-tertiary)] rounded-md p-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      {detail.answer}
                    </div>
                    {detail.responseTimeMs && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--color-text-muted)]">
                        <Clock size={12} />
                        {(detail.responseTimeMs / 1000).toFixed(1)}s response time
                      </div>
                    )}
                  </section>
                )}

                {/* Score summary */}
                {detail.finalScore !== null && (
                  <section>
                    <SectionHeader icon={Star} title="Score" />
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-bold text-[var(--color-text-primary)]">
                        {detail.finalScore.toFixed(1)}
                      </div>
                      {detail.finalRank && (
                        <div className="text-sm text-[var(--color-text-muted)]">
                          Rank #{detail.finalRank}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Judgments received */}
                {detail.judgmentsReceived && detail.judgmentsReceived.length > 0 && (
                  <section>
                    <SectionHeader icon={Star} title="Judgments Received" />
                    <div className="space-y-2">
                      {detail.judgmentsReceived.map((j) => (
                        <div
                          key={j.id}
                          className="bg-[var(--color-bg-tertiary)] rounded-md p-3"
                        >
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
                              {j.judgeName}
                              {j.isMasterJudgment && (
                                <Crown size={10} className="text-[var(--color-master)]" />
                              )}
                            </span>
                            <span className="text-sm font-medium text-[var(--color-text-primary)]">
                              {j.score}/100
                            </span>
                          </div>
                          {j.reasoning && (
                            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                              {j.reasoning}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper components

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
      <Icon size={14} />
      {title}
    </h3>
  );
}

function LoadingState() {
  return (
    <div className="text-center py-8">
      <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-[var(--color-text-muted)] mt-3 text-sm">Loading...</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-[var(--color-text-muted)] text-sm">{message}</p>
    </div>
  );
}
