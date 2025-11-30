// Speech bubble for showing answer previews
// Pure CSS approach with tail pointing toward model

import { motion, AnimatePresence } from 'framer-motion';

interface SpeechBubbleProps {
  /** The text to display (first ~15 words recommended) */
  text: string;
  /** Position relative to model node */
  position: 'top' | 'bottom';
  /** Whether bubble is visible */
  isVisible: boolean;
  /** Optional max width in pixels */
  maxWidth?: number;
}

export function SpeechBubble({
  text,
  position = 'top',
  isVisible,
  maxWidth = 180,
}: SpeechBubbleProps) {
  return (
    <AnimatePresence>
      {isVisible && text && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className="relative"
          style={{ maxWidth }}
        >
          {/* Bubble body */}
          <div
            className="relative bg-[var(--color-bubble-bg)] text-[var(--color-bubble-text)]
                       px-3 py-2 rounded-lg shadow-lg text-xs leading-relaxed"
          >
            {truncateText(text, 60)}

            {/* Tail (arrow) using CSS */}
            <div
              className={`absolute w-0 h-0 left-1/2 -translate-x-1/2
                ${position === 'top'
                  ? 'top-full border-t-[var(--color-bubble-bg)] border-t-[6px] border-x-[6px] border-x-transparent border-b-0'
                  : 'bottom-full border-b-[var(--color-bubble-bg)] border-b-[6px] border-x-[6px] border-x-transparent border-t-0'
                }`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Truncate text to approximately N characters, breaking at word boundary
 */
function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxChars * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Get first N words from text
 */
export function getPreviewWords(text: string, wordCount: number = 15): string {
  const words = text.split(/\s+/).slice(0, wordCount);
  return words.join(' ') + (text.split(/\s+/).length > wordCount ? '...' : '');
}
