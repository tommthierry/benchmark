// Schedule Configuration - Loads and manages schedule settings
// Configuration is loaded from environment variables

import type { ScheduleConfig } from '../scheduler/index.js';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

/**
 * Load schedule configuration from environment variables
 *
 * Environment variables:
 * - SCHEDULE_WEEKLY_ENABLED: true/false (default: true)
 * - SCHEDULE_WEEKLY_CRON: cron expression (default: "0 2 * * 1")
 * - SCHEDULE_MONTHLY_ENABLED: true/false (default: true)
 * - SCHEDULE_MONTHLY_CRON: cron expression (default: "0 3 1 * *")
 * - TZ: timezone for scheduling (default: UTC)
 */
export function loadScheduleConfig(): ScheduleConfig {
  const config: ScheduleConfig = {
    weekly: {
      enabled: process.env.SCHEDULE_WEEKLY_ENABLED !== 'false',
      cron: process.env.SCHEDULE_WEEKLY_CRON || '0 2 * * 1',
    },
    monthly: {
      enabled: process.env.SCHEDULE_MONTHLY_ENABLED !== 'false',
      cron: process.env.SCHEDULE_MONTHLY_CRON || '0 3 1 * *',
    },
  };

  logger.debug({ config }, 'Schedule configuration loaded');
  return config;
}

/**
 * Get default schedule configuration
 */
export function getDefaultScheduleConfig(): ScheduleConfig {
  return {
    weekly: {
      enabled: true,
      cron: '0 2 * * 1', // Monday at 2:00 AM
    },
    monthly: {
      enabled: true,
      cron: '0 3 1 * *', // 1st of month at 3:00 AM
    },
  };
}
