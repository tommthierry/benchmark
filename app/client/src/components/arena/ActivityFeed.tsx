// Live scrolling feed of arena events
// Shows recent activity with animated entries

import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';
import { feedItem } from '../../styles/animations';
import type { ActivityItem } from '../../hooks/useArenaActivity';

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxHeight?: number;
}

export function ActivityFeed({ activities, maxHeight = 280 }: ActivityFeedProps) {
  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-bg-tertiary)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-bg-tertiary)]">
        <Activity size={14} className="text-[var(--color-text-muted)]" />
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
          Live Activity
        </h3>
        {activities.length > 0 && (
          <span className="ml-auto text-xs text-[var(--color-text-muted)]">
            {activities.length} events
          </span>
        )}
      </div>

      {/* Activity list */}
      <div
        className="overflow-y-auto overflow-x-hidden"
        style={{ maxHeight }}
      >
        {activities.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-[var(--color-text-muted)]">
              Waiting for activity...
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {activities.map((activity) => (
              <motion.div
                key={activity.id}
                variants={feedItem}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="px-4 py-2.5 border-b border-[var(--color-bg-tertiary)] last:border-0"
              >
                <div className="flex items-start gap-3">
                  {/* Type indicator */}
                  <div
                    className="w-1.5 h-1.5 mt-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getActivityColor(activity.type) }}
                  />
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {activity.message}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {activity.timestamp}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function getActivityColor(type: ActivityItem['type']): string {
  switch (type) {
    case 'step':
      return 'var(--color-accent)';
    case 'score':
      return 'var(--color-success)';
    case 'system':
      return 'var(--color-warning)';
    default:
      return 'var(--color-text-muted)';
  }
}
