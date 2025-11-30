// Modal showing model's answer, judgments received and given
// Features: Answer/Judgments tabs, left/right model navigation

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Star, Clock, Crown, Scale, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { arenaApi } from '../../lib/api';
import { modalBackdrop, modalContent } from '../../styles/animations';
import { Markdown } from '../Markdown';
import type { ModelRoundDetail, JudgmentInfo } from '@sabe/shared';

type TabType = 'answer' | 'judgments';

interface ModelDetailModalProps {
  modelId: string;
  roundId?: string;
  onClose: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function ModelDetailModal({
  modelId,
  roundId,
  onClose,
  onNavigate,
  hasPrev = false,
  hasNext = false,
}: ModelDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('answer');

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev && onNavigate) {
        onNavigate('prev');
      } else if (e.key === 'ArrowRight' && hasNext && onNavigate) {
        onNavigate('next');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigate, hasPrev, hasNext]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['arena', 'model-detail', roundId, modelId],
    queryFn: () => arenaApi.getModelRoundDetail(roundId!, modelId),
    enabled: !!roundId,
  });

  const detail = data?.data;

  // Set default tab when model changes or data loads
  // Show judgments tab if model has given judgments, otherwise show answer
  useEffect(() => {
    if (detail?.judgmentsGiven && detail.judgmentsGiven.length > 0) {
      setActiveTab('judgments');
    } else {
      setActiveTab('answer');
    }
  }, [modelId, detail]);

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
        {/* Left navigation arrow */}
        {onNavigate && hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate('prev'); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full
                       bg-[var(--color-bg-secondary)]/90 hover:bg-[var(--color-bg-tertiary)]
                       text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]
                       transition-colors z-10 backdrop-blur-sm"
            title="Previous model (←)"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Modal content */}
        <motion.div
          variants={modalContent}
          initial="initial"
          animate="animate"
          exit="exit"
          className="bg-[var(--color-bg-secondary)] rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden border border-[var(--color-bg-tertiary)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with tabs */}
          <div className="p-4 border-b border-[var(--color-bg-tertiary)]">
            {/* Title row */}
            <div className="flex items-center justify-between mb-3">
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

            {/* Tab buttons */}
            <div className="flex gap-2">
              <TabButton
                active={activeTab === 'answer'}
                onClick={() => setActiveTab('answer')}
                icon={MessageSquare}
                label="Answer"
              />
              <TabButton
                active={activeTab === 'judgments'}
                onClick={() => setActiveTab('judgments')}
                icon={Scale}
                label="Judgments"
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-5 overflow-y-auto max-h-[60vh]">
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState message={roundId ? 'Failed to load details' : 'No round in progress'} />
            ) : !detail ? (
              <ErrorState message="No details available" />
            ) : activeTab === 'answer' ? (
              <AnswerTabContent detail={detail} />
            ) : (
              <JudgmentsTabContent detail={detail} />
            )}
          </div>
        </motion.div>

        {/* Right navigation arrow */}
        {onNavigate && hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate('next'); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full
                       bg-[var(--color-bg-secondary)]/90 hover:bg-[var(--color-bg-tertiary)]
                       text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]
                       transition-colors z-10 backdrop-blur-sm"
            title="Next model (→)"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// TAB CONTENT COMPONENTS
// =============================================================================

function AnswerTabContent({ detail }: { detail: ModelRoundDetail }) {
  return (
    <>
      {/* Master indicator */}
      {detail.isMaster && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--color-master)]/10 border border-[var(--color-master)]/30">
          <Crown size={14} className="text-[var(--color-master)]" />
          <span className="text-xs text-[var(--color-master)]">
            Master of this round - created the question
          </span>
        </div>
      )}

      {/* Answer section */}
      {detail.answer ? (
        <section>
          <SectionHeader icon={MessageSquare} title="Answer" />
          <div className="bg-[var(--color-bg-tertiary)] rounded-md p-3 text-sm text-[var(--color-text-secondary)]">
            <Markdown>{detail.answer}</Markdown>
          </div>
          {detail.responseTimeMs && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--color-text-muted)]">
              <Clock size={12} />
              {(detail.responseTimeMs / 1000).toFixed(1)}s response time
            </div>
          )}
        </section>
      ) : (
        <div className="text-center py-6">
          <MessageSquare className="w-8 h-8 text-[var(--color-text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-sm text-[var(--color-text-muted)]">
            {detail.isMaster ? 'Master does not answer questions' : 'No answer submitted yet'}
          </p>
        </div>
      )}

      {/* Score summary */}
      {detail.finalScore !== null && (
        <section>
          <SectionHeader icon={Star} title="Final Score" />
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
              <JudgmentCard key={j.id} judgment={j} showJudge />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function JudgmentsTabContent({ detail }: { detail: ModelRoundDetail }) {
  if (!detail.judgmentsGiven || detail.judgmentsGiven.length === 0) {
    return (
      <div className="text-center py-8">
        <Scale className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-4 opacity-50" />
        <p className="text-sm text-[var(--color-text-muted)]">
          {detail.isMaster
            ? 'Master judges last - waiting for other models'
            : 'No judgments given yet'}
        </p>
        {!detail.isMaster && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2 opacity-70">
            Judgments appear after the model completes evaluation
          </p>
        )}
      </div>
    );
  }

  return (
    <section>
      <SectionHeader icon={Scale} title="Judgments Given" />
      <p className="text-xs text-[var(--color-text-muted)] mb-3">
        Rankings assigned by {detail.model.displayName} to other models
      </p>
      <div className="space-y-2">
        {detail.judgmentsGiven.map((j) => (
          <JudgmentGivenCard key={j.id} judgment={j} />
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}

function TabButton({ active, onClick, icon: Icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active
          ? 'bg-[var(--color-accent)] text-white'
          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]/80'
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
      <Icon size={14} />
      {title}
    </h3>
  );
}

function JudgmentCard({ judgment, showJudge }: { judgment: JudgmentInfo; showJudge?: boolean }) {
  return (
    <div className="bg-[var(--color-bg-tertiary)] rounded-md p-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
          {showJudge && judgment.judgeName}
          {judgment.isMasterJudgment && (
            <Crown size={10} className="text-[var(--color-master)]" />
          )}
        </span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {judgment.score}/100
        </span>
      </div>
      {judgment.reasoning && (
        <div className="text-xs text-[var(--color-text-secondary)]">
          <Markdown compact>{judgment.reasoning}</Markdown>
        </div>
      )}
    </div>
  );
}

function JudgmentGivenCard({ judgment }: { judgment: JudgmentInfo }) {
  return (
    <div className="bg-[var(--color-bg-tertiary)] rounded-md p-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-[var(--color-text-muted)]">
          To: <span className="text-[var(--color-text-secondary)]">{judgment.targetName}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">Rank #{judgment.rank}</span>
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {judgment.score}/100
          </span>
        </div>
      </div>
      {judgment.reasoning && (
        <div className="text-xs text-[var(--color-text-secondary)]">
          <Markdown compact>{judgment.reasoning}</Markdown>
        </div>
      )}
    </div>
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
