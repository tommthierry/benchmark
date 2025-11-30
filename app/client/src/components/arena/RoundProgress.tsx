// Round progress indicator
// Shows completed rounds vs total with visual bar

import { motion } from 'framer-motion';

interface RoundProgressProps {
  current: number;
  total: number;
}

export function RoundProgress({ current, total }: RoundProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      {/* Progress bar */}
      <div className="w-24 md:w-32 h-1.5 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[var(--color-accent)] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Text label */}
      <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
        {current}/{total}
      </span>
    </div>
  );
}
