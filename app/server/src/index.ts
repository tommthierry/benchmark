// SABE Server - Express API with Drizzle ORM
// Load environment variables from project root
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from project root (3 levels up from dist/src/index.js)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import pino from 'pino';
import { APP_NAME, APP_VERSION, type HealthResponse } from '@sabe/shared';
import { runMigrations } from './db/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { getProviderManager } from './services/llm/index.js';
import { getScheduler } from './scheduler/index.js';
import { loadScheduleConfig } from './config/schedule.js';

// API Routes
import providersRouter from './api/providers.js';
import modelsRouter from './api/models.js';
import questionsRouter from './api/questions.js';
import llmRouter from './api/llm.js';
import runsRouter from './api/runs.js';
import rankingsRouter from './api/rankings.js';
import scheduleRouter from './api/schedule.js';

// Logger setup
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined,
});

const app = express();
const PORT = process.env.PORT || 3000;

// Track server for graceful shutdown
let server: ReturnType<typeof app.listen>;
let isShuttingDown = false;

// Middleware
app.use(express.json());

// API Routes
app.get('/api/health', (_req, res) => {
  const response: HealthResponse = {
    status: isShuttingDown ? 'error' : 'ok',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
  };
  res.status(isShuttingDown ? 503 : 200).json({ data: response });
});

app.use('/api/providers', providersRouter);
app.use('/api/models', modelsRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/llm', llmRouter);
app.use('/api/runs', runsRouter);
app.use('/api/rankings', rankingsRouter);
app.use('/api/schedule', scheduleRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // Express 5 requires named wildcard parameters
  app.get('{*path}', (req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handling - must be after all routes
app.use('/api/{*path}', notFoundHandler); // 404 for unmatched API routes
app.use(errorHandler);

// Graceful shutdown handler
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress');
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, 'Received shutdown signal');

  // Stop scheduler first
  const scheduler = getScheduler();
  scheduler.stop();
  logger.info('Scheduler stopped');

  // Set timeout for forced exit
  const timeout = setTimeout(() => {
    logger.warn('Shutdown timeout - forcing exit');
    process.exit(1);
  }, 10000); // 10 second timeout

  // Close HTTP server
  if (server) {
    server.close(() => {
      clearTimeout(timeout);
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    clearTimeout(timeout);
    process.exit(0);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});

// Start server
async function start(): Promise<void> {
  try {
    // Run database migrations
    runMigrations();

    // Initialize LLM provider manager
    await getProviderManager();
    logger.info('LLM provider manager initialized');

    // Load and start scheduler
    const scheduleConfig = loadScheduleConfig();
    const scheduler = getScheduler();
    scheduler.updateConfig(scheduleConfig);
    scheduler.start();
    logger.info('Scheduler initialized');

    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info({
        port: PORT,
        env: process.env.NODE_ENV || 'development',
      }, `${APP_NAME} server running`);
    });
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

start();
