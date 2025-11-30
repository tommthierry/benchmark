// SABE Database Connection - Drizzle ORM with better-sqlite3
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure data directory exists
const dataDir = path.resolve(__dirname, '../../../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
const dbPath = process.env.DATABASE_URL || path.join(dataDir, 'sabe.db');

// Initialize SQLite connection
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL'); // Better write performance
sqlite.pragma('foreign_keys = ON'); // Enforce foreign key constraints

// Create Drizzle instance with schema for relational queries
export const db = drizzle(sqlite, { schema });

// Run migrations from the drizzle folder
export function runMigrations(): void {
  const migrationsPath = path.resolve(__dirname, '../../drizzle');

  try {
    migrate(db, { migrationsFolder: migrationsPath });
    console.log('[DB] Migrations completed successfully');
  } catch (error) {
    console.error('[DB] Migration failed:', error);
    throw error;
  }
}

// Export schema for use in routes
export { schema };

// Export types
export type {
  Provider, NewProvider,
  Model, NewModel,
  QuestionType, NewQuestionType,
  Question, NewQuestion,
  BenchmarkRun, NewBenchmarkRun,
  TaskExecution, NewTaskExecution,
  Evaluation, NewEvaluation,
  Ranking, NewRanking,
  ExecutionConfig, NewExecutionConfig,
} from './schema.js';
