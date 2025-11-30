// Displays current question with topic and master info
// Animated transitions when question changes

import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { slideUp } from '../../styles/animations';
import { Markdown } from '../Markdown';

interface QuestionPanelProps {
  question?: string | null;
  topic?: string;
  masterName?: string;
  masterColor?: string;
}

export function QuestionPanel({ question, topic, masterName, masterColor }: QuestionPanelProps) {
  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-5 border border-[var(--color-bg-tertiary)]">
      {/* Topic badge */}
      {topic && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-tertiary)] text-xs text-[var(--color-text-secondary)] mb-4">
          <MessageSquare size={12} />
          {formatTopic(topic)}
        </div>
      )}

      {/* Question content with animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question || 'empty'}
          variants={slideUp}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {question ? (
            <div className="text-base md:text-lg text-[var(--color-text-primary)]">
              <Markdown>{question}</Markdown>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-[var(--color-text-muted)] italic text-sm">
                Waiting for question...
              </p>
              <p className="text-[var(--color-text-muted)] text-xs mt-1">
                The master will create a question soon
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Master attribution */}
      {masterName && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--color-bg-tertiary)]">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: masterColor || 'var(--color-master)' }}
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            Question by{' '}
            <span
              className="font-medium"
              style={{ color: masterColor || 'var(--color-master)' }}
            >
              {masterName}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

function formatTopic(topic: string): string {
  // Convert snake_case or kebab-case to Title Case
  return topic
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
