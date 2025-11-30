// Hook for managing arena activity feed
// Stores recent arena events for display

import { useState, useCallback } from 'react';

export interface ActivityItem {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'step' | 'score' | 'system' | 'error';
}

interface UseArenaActivityOptions {
  maxItems?: number;
}

export function useArenaActivity(options: UseArenaActivityOptions = {}) {
  const { maxItems = 20 } = options;
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const addActivity = useCallback((activity: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    const newActivity: ActivityItem = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };

    setActivities((prev) => {
      const updated = [newActivity, ...prev];
      return updated.slice(0, maxItems);
    });
  }, [maxItems]);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  return {
    activities,
    addActivity,
    clearActivities,
  };
}
