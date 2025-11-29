// Scheduler Service - Manages automated benchmark execution
// Uses node-cron v4 for cron-like scheduling

import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import pino from 'pino';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { getBenchmarkRunner } from '../services/benchmark-runner.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

/**
 * Schedule configuration for a single schedule type
 */
export interface ScheduleEntry {
  enabled: boolean;
  cron: string; // Cron expression (e.g., "0 2 * * 1")
  modelIds?: string[];
  questionIds?: string[];
}

/**
 * Full schedule configuration
 */
export interface ScheduleConfig {
  weekly: ScheduleEntry;
  monthly: ScheduleEntry;
}

/**
 * Scheduler status response
 */
export interface SchedulerStatus {
  isRunning: boolean;
  tasks: string[];
  config: ScheduleConfig;
  nextRuns: Record<string, string | null>;
}

// Default cron expressions:
// Weekly: Monday at 2:00 AM UTC
// Monthly: 1st of month at 3:00 AM UTC
const DEFAULT_CONFIG: ScheduleConfig = {
  weekly: {
    enabled: true,
    cron: '0 2 * * 1',
  },
  monthly: {
    enabled: true,
    cron: '0 3 1 * *',
  },
};

/**
 * Scheduler class - manages automated benchmark runs
 */
export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private config: ScheduleConfig;
  private isRunning = false;

  constructor(config: Partial<ScheduleConfig> = {}) {
    this.config = {
      weekly: { ...DEFAULT_CONFIG.weekly, ...config.weekly },
      monthly: { ...DEFAULT_CONFIG.monthly, ...config.monthly },
    };
  }

  /**
   * Start the scheduler with configured schedules
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler already running');
      return;
    }

    logger.info('Starting scheduler');

    // Schedule weekly benchmark
    if (this.config.weekly.enabled) {
      this.scheduleTask('weekly', this.config.weekly.cron, async () => {
        await this.runScheduledBenchmark('weekly');
      });
    }

    // Schedule monthly benchmark
    if (this.config.monthly.enabled) {
      this.scheduleTask('monthly', this.config.monthly.cron, async () => {
        await this.runScheduledBenchmark('monthly');
      });
    }

    this.isRunning = true;
    logger.info({
      weekly: this.config.weekly.enabled ? this.config.weekly.cron : 'disabled',
      monthly: this.config.monthly.enabled ? this.config.monthly.cron : 'disabled',
    }, 'Scheduler started');
  }

  /**
   * Stop the scheduler and all tasks
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping scheduler');

    for (const [name, task] of this.tasks) {
      task.stop();
      logger.debug({ name }, 'Stopped scheduled task');
    }

    this.tasks.clear();
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  /**
   * Schedule a task with cron expression
   */
  private scheduleTask(
    name: string,
    cronExpression: string,
    job: () => Promise<void>
  ): void {
    if (!cron.validate(cronExpression)) {
      logger.error({ name, cron: cronExpression }, 'Invalid cron expression');
      return;
    }

    // node-cron v4: use schedule() which auto-starts the task
    // Options: timezone, name (optional)
    const task = cron.schedule(
      cronExpression,
      async () => {
        logger.info({ name }, 'Scheduled job triggered');
        try {
          await job();
          logger.info({ name }, 'Scheduled job completed');
        } catch (error) {
          logger.error({ name, error: (error as Error).message }, 'Scheduled job failed');
        }
      },
      {
        timezone: process.env.TZ || 'UTC',
        name,
      }
    );

    this.tasks.set(name, task);
    logger.debug({ name, cron: cronExpression }, 'Scheduled task registered');
  }

  /**
   * Run a scheduled benchmark
   */
  private async runScheduledBenchmark(type: 'weekly' | 'monthly'): Promise<void> {
    const config = type === 'weekly' ? this.config.weekly : this.config.monthly;

    logger.info({
      type,
      modelIds: config.modelIds,
      questionIds: config.questionIds,
    }, 'Starting scheduled benchmark');

    // Check if a run is already in progress
    const [runningRun] = await db
      .select()
      .from(schema.benchmarkRuns)
      .where(eq(schema.benchmarkRuns.status, 'running'))
      .limit(1);

    if (runningRun) {
      logger.warn({
        runningRunId: runningRun.id,
      }, 'Skipping scheduled run - another run is in progress');
      return;
    }

    try {
      const runner = getBenchmarkRunner();
      const runId = await runner.startRun({
        modelIds: config.modelIds,
        questionIds: config.questionIds,
      });

      logger.info({ type, runId }, 'Scheduled benchmark started');
    } catch (error) {
      logger.error({
        type,
        error: (error as Error).message,
      }, 'Failed to start scheduled benchmark');
    }
  }

  /**
   * Get current scheduler status
   */
  getStatus(): SchedulerStatus {
    const nextRuns: Record<string, string | null> = {};

    // node-cron doesn't expose next run time, so we calculate it
    for (const name of this.tasks.keys()) {
      nextRuns[name] = this.getNextRunTime(name);
    }

    return {
      isRunning: this.isRunning,
      tasks: Array.from(this.tasks.keys()),
      config: this.config,
      nextRuns,
    };
  }

  /**
   * Get next run time for a schedule
   * Uses node-cron v4's getNextRun() method
   */
  private getNextRunTime(name: string): string | null {
    const task = this.tasks.get(name);
    if (!task) return null;

    const nextRun = task.getNextRun();
    return nextRun ? nextRun.toISOString() : null;
  }

  /**
   * Update scheduler configuration
   * Restarts scheduler if it was running
   */
  updateConfig(newConfig: Partial<ScheduleConfig>): void {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = {
      weekly: { ...this.config.weekly, ...newConfig.weekly },
      monthly: { ...this.config.monthly, ...newConfig.monthly },
    };

    if (wasRunning) {
      this.start();
    }

    logger.info({ config: this.config }, 'Scheduler config updated');
  }

  /**
   * Manually trigger a scheduled run
   */
  async triggerRun(type: 'weekly' | 'monthly'): Promise<string> {
    logger.info({ type }, 'Manually triggering scheduled run');

    const runner = getBenchmarkRunner();
    const config = type === 'weekly' ? this.config.weekly : this.config.monthly;

    const runId = await runner.startRun({
      modelIds: config.modelIds,
      questionIds: config.questionIds,
    });

    logger.info({ type, runId }, 'Manually triggered run started');
    return runId;
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
let schedulerInstance: Scheduler | null = null;

/**
 * Get the singleton scheduler instance
 */
export function getScheduler(): Scheduler {
  if (!schedulerInstance) {
    schedulerInstance = new Scheduler();
  }
  return schedulerInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
    schedulerInstance = null;
  }
}
